import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/reports.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { buildReport, reportRange } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
const row = (date, amount, type = 'expense', category = 'food') => ({ id: date + amount, date, amount, type, category, description: '' });
test('Custom range rejects missing, impossible, or reversed dates', () => {
  assert.equal(reportRange('custom', '', '2026-09-30', []), null);
  assert.equal(reportRange('custom', '2026-02-30', '2026-03-01', []), null);
  assert.equal(reportRange('custom', '2026-09-30', '2026-09-01', []), null);
});
test('Report includes boundaries, retains paise, and includes unknown categories', () => {
  const report = buildReport([row('2026-09-01', 0.1), row('2026-09-30', 0.2, 'expense', 'deleted'), row('2026-10-01', 99)], [], [], { start: '2026-09-01', end: '2026-09-30' });
  assert.equal(report.expenses, 0.3); assert.equal(report.rows.length, 2); assert.equal(report.categories.length, 2); assert.equal(report.savingsRate, null);
});
test('Budget allocation covers multiple months and prorates leap-year partial months', () => {
  const budgets = [{ categoryId: 'food', limit: 2900 }];
  const full = buildReport([], [], budgets, { start: '2024-01-01', end: '2024-02-29' });
  assert.equal(full.categories[0].limit, 5800);
  const partial = buildReport([], [], budgets, { start: '2024-02-15', end: '2024-02-29' });
  assert.equal(partial.categories[0].limit, 1500);
});
test('Month totals reconcile and negative savings remain valid', () => {
  const report = buildReport([row('2026-08-01', 10, 'income'), row('2026-09-01', 20)], [], [], { start: '2026-08-01', end: '2026-09-30' });
  assert.equal(report.net, -10); assert.equal(report.savingsRate, -1);
  assert.equal(report.monthly.reduce((sum, m) => sum + m.net, 0), report.net);
});
