import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const folder = new URL('tmp/report-qa/', root); fs.mkdirSync(folder, { recursive: true });
for (const name of ['reports', 'report-exports']) {
  const source = fs.readFileSync(new URL(`src/lib/${name}.ts`, root), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText.replace('require("./reports")', 'require("./reports.cjs")');
  fs.writeFileSync(new URL(`${name}.cjs`, folder), compiled);
}
const require = createRequire(import.meta.url);
const { buildReport } = require(fileURLToPath(new URL('reports.cjs', folder)));
const { createReportPDF, createReportExcel } = require(fileURLToPath(new URL('report-exports.cjs', folder)));
const rows = Array.from({ length: 85 }, (_, index) => ({ id: `sample-${String(index).padStart(3, '0')}`, date: `2026-${String(4 + index % 6).padStart(2, '0')}-${String(1 + index % 28).padStart(2, '0')}`, amount: index % 7 ? 1234.56 + index : 50000.99, type: index % 7 ? 'expense' : 'income', category: index % 2 ? 'food' : 'other', description: index === 84 ? 'FINAL RECORD - pagination verified' : index === 12 ? 'Long description: ' + 'Monthly groceries and household supplies, with a detailed receipt description. '.repeat(6) : `Sample transaction ${index}`, isRecurring: index % 13 === 0, recurringInterval: 'monthly' }));
const report = buildReport(rows, [{ id: 'food', name: 'Food & Groceries' }, { id: 'other', name: 'Other expenses' }], [{ categoryId: 'food', limit: 5000 }], { start: '2026-04-01', end: '2026-09-30' });
const pdf = createReportPDF(report, fs.readFileSync(new URL('public/fonts/DejaVuSans.ttf', root)).toString('base64'));
fs.writeFileSync(new URL('sample-report.pdf', folder), Buffer.from(pdf.output('arraybuffer')));
const workbook = await createReportExcel(report); await workbook.xlsx.writeFile(fileURLToPath(new URL('sample-report.xlsx', folder)));
const ExcelJS = require('exceljs'); const reopened = new ExcelJS.Workbook(); await reopened.xlsx.readFile(fileURLToPath(new URL('sample-report.xlsx', folder)));
assert.equal(reopened.worksheets.length, 5); assert.equal(reopened.getWorksheet('Transactions').rowCount - 5, 85);
assert.equal(reopened.getWorksheet('Summary').getCell('B6').value, report.income); assert.equal(reopened.getWorksheet('Summary').getCell('B7').value, report.expenses);
assert.ok(reopened.getWorksheet('Transactions').getCell('A6').value instanceof Date);
assert.match(reopened.getWorksheet('Transactions').getCell('E6').numFmt, /₹.*0\.00/);
assert.equal(reopened.getWorksheet('Transactions').views[0].ySplit, 5);
console.log(JSON.stringify({ pages: pdf.getNumberOfPages(), transactions: 85, sheets: 5, income: report.income, expenses: report.expenses, workbookChecks: 'passed' }));
