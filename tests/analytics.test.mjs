import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { buildAnalytics, formatINR } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
const transaction = (date, type, amount, category = 'food') => ({ id: date + type, date, type, amount, category, description: '' });
test('Six-month window crosses year boundaries and fills empty months', () => {
  const result = buildAnalytics([transaction('2025-12-31', 'income', 100), transaction('2026-01-01', 'expense', 120), transaction('2025-07-31', 'income', 900)], [], '2026-01');
  assert.deepEqual(result.line.map(row => row.month), ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01']);
  assert.equal(result.line[0].income, 0); assert.equal(result.line[4].income, 100); assert.equal(result.line[5].savings, -120);
});
test('Donut includes only selected month expenses and retains unknown categories', () => {
  const rows = [transaction('2026-01-01', 'expense', 100), transaction('2026-01-02', 'expense', 50), transaction('2026-01-03', 'expense', 25, 'deleted'), transaction('2026-01-04', 'income', 500), transaction('2025-12-31', 'expense', 200)];
  const before = structuredClone(rows);
  const result = buildAnalytics(rows, [{ id: 'food', name: 'Food', color: '#2563eb' }], '2026-01');
  assert.equal(result.total, 175); assert.equal(result.donut[0].value, 150); assert.equal(result.donut[1].label, 'Uncategorized'); assert.deepEqual(rows, before);
});
test('Empty and income-only periods produce no donut segments', () => {
  assert.equal(buildAnalytics([], [], '2026-01').hasLineData, false);
  const result = buildAnalytics([transaction('2026-01-01', 'income', 50)], [], '2026-01');
  assert.equal(result.hasLineData, true); assert.equal(result.total, 0); assert.deepEqual(result.donut, []);
});
test('Currency uses rupees, Indian grouping, and decimal precision', () => {
  assert.match(formatINR(123456.78), /₹1,23,456\.78/);
  assert.match(formatINR(-100), /-₹100/);
});
