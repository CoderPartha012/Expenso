import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/transaction-table.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { sortTransactions, paginateTransactions, togglePageSelection, transactionsCSV } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
const rows = Array.from({length: 21}, (_, i) => ({id: String(i), amount: i + 0.25, type: i % 2 ? 'income' : 'expense', date: '2026-09-01', category: 'food', description: 'Item ' + i}));
test('Filtering and sorting preserve the store array', () => {
  const before = structuredClone(rows);
  const result = sortTransactions(rows, 'expense', 'amount-desc');
  assert.equal(result.length, 11); assert.equal(result[0].amount, 20.25); assert.deepEqual(rows, before);
});
test('Pagination clamps when filters shrink results, including empty results', () => {
  assert.equal(paginateTransactions(rows, 3).rows.length, 1);
  assert.equal(paginateTransactions(rows.slice(0, 2), 3).page, 1);
  assert.deepEqual(paginateTransactions([], 9), { page: 1, pages: 1, rows: [] });
});
test('Select all applies to the current page and preserves other pages', () => {
  const selection = new Set(['20', '0']);
  const page = rows.slice(0, 10);
  const next = togglePageSelection(selection, page);
  assert.equal(next.size, 11); assert.equal(selection.size, 2);
  const cleared = togglePageSelection(next, page);
  assert.deepEqual([...cleared], ['20']);
});
test('CSV declares INR and handles quotes, multiline text, and spreadsheet formulas', () => {
  const csv = transactionsCSV([{...rows[0], description: '=SUM(1,2)', amount: 123456.78}, {...rows[1], description: 'Lunch "special"\nDinner'}], () => 'Food, drinks');
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('Amount (INR)'));
  assert.ok(csv.includes('"\'=SUM(1,2)"')); assert.ok(csv.includes('"123456.78"'));
  assert.ok(csv.includes('"Food, drinks"')); assert.ok(csv.includes('"Lunch ""special""\nDinner"'));
});
