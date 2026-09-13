import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { reportDate, reportMoney, type Report } from './reports';

const budgetNote = 'Budget allocations use current saved monthly limits, prorated by calendar days in each month. Historical limits are not stored.';
export function createReportPDF(report: Report, font: string) {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', compress: true });
  doc.addFileToVFS('DejaVuSans.ttf', font); doc.addFont('DejaVuSans.ttf', 'Report', 'normal'); doc.addFont('DejaVuSans.ttf', 'Report', 'bold'); doc.setFont('Report');
  const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
  let y = 40;
  const section = (title: string, head: string[], body: (string | number)[][], numeric: number[] = [], widths?: number[]) => {
    if (y > height - 42) { doc.addPage(); y = 28; }
    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(title, 14, y); y += 5;
    autoTable(doc, {
      startY: y, head: [head], body, margin: { top: 25, bottom: 18, left: 14, right: 14 },
      styles: { font: 'Report', fontSize: 8, cellPadding: 2.7, overflow: 'linebreak', valign: 'top', textColor: [30, 41, 59] },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'normal' },
      alternateRowStyles: { fillColor: [248, 250, 252] }, rowPageBreak: 'avoid', showHead: 'everyPage',
      columnStyles: Object.fromEntries(head.map((_, index) => [index, { ...(numeric.includes(index) ? { halign: 'right' as const } : {}), ...(widths ? { cellWidth: widths[index] } : {}) }])),
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  };
  section('Financial summary', ['Income (INR)', 'Expenses (INR)', 'Net savings (INR)', 'Savings rate', 'Transactions'], [[reportMoney(report.income), reportMoney(report.expenses), reportMoney(report.net), report.savingsRate === null ? 'No income' : `${(report.savingsRate * 100).toFixed(1)}%`, report.rows.length]], [0, 1, 2, 3, 4]);
  section('Monthly totals', ['Month', 'Income (INR)', 'Expenses (INR)', 'Net savings (INR)'], report.monthly.map(m => [m.month, reportMoney(m.income), reportMoney(m.expenses), reportMoney(m.net)]), [1, 2, 3]);
  section('Category breakdown', ['Category', 'Income (INR)', 'Expenses (INR)', 'Expense share', 'Transactions'], report.categories.filter(c => c.count).map(c => [c.name, reportMoney(c.income), reportMoney(c.spent), `${(c.share * 100).toFixed(1)}%`, c.count]), [1, 2, 3, 4]);
  const budgets = report.categories.filter(c => c.limit !== null);
  if (budgets.length) {
    section('Budget comparison (prorated current limits)', ['Category', 'Monthly limit (INR)', 'Period allocation (INR)', 'Spent (INR)', 'Remaining (INR)', 'Status'], budgets.map(c => [c.name, reportMoney(c.monthlyLimit!), reportMoney(c.limit!), reportMoney(c.spent), reportMoney(c.remaining!), c.remaining! < 0 ? 'Over allocation' : 'Within allocation']), [1, 2, 3, 4]);
  }
  const names = new Map(report.categories.map(c => [c.id, c.name]));
  section(`Transaction detail (${report.rows.length})`, ['Date', 'Description', 'Category', 'Type', 'Amount (INR)', 'Repeat'], report.rows.map(t => [reportDate(t.date), t.description || 'Untitled', names.get(t.category) ?? 'Uncategorized', t.type === 'income' ? 'Income' : 'Expense', reportMoney(t.amount), t.isRecurring ? t.recurringInterval ?? 'Yes' : 'No']), [4], [27, 112, 43, 22, 40, 25]);
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setFillColor(15, 23, 42); doc.rect(0, 0, width, 21, 'F'); doc.setTextColor(255); doc.setFontSize(15); doc.text('Expenso | Financial Report', 14, 10); doc.setFontSize(8); doc.text(`${reportDate(report.range.start)} - ${reportDate(report.range.end)} | Currency: INR`, 14, 16);
    doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.text(`Generated ${new Date().toLocaleDateString('en-IN')} | Page ${page} of ${doc.getNumberOfPages()}`, width - 14, height - 6, { align: 'right' });
    doc.text('Net savings = income - expenses. Savings rate = net / income.', 14, height - 10);
    doc.text(budgetNote, 14, height - 6);
  }
  doc.setProperties({ title: 'Expenso Financial Report', subject: `${report.range.start} to ${report.range.end}`, creator: 'Expenso' });
  return doc;
}

export async function createReportExcel(report: Report) {
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'Expenso'; workbook.created = new Date();
  const currency = '"₹" #,##0.00;[Red]-"₹" #,##0.00';
  const sheet = (name: string, headers: string[], rows: (string | number | Date | null)[][], widths: number[], moneyColumns: number[] = [], percentColumns: number[] = []) => {
    const ws = workbook.addWorksheet(name, { views: name === 'Summary' ? [] : [{ state: 'frozen', ySplit: 5, xSplit: name === 'Transactions' ? 1 : 0 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5', margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } } });
    ws.columns = widths.map(width => ({ width })); ws.mergeCells(1, 1, 1, headers.length); ws.getCell('A1').value = `Expenso - ${name}`; ws.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } }; ws.getRow(1).height = 34;
    ws.mergeCells(2, 1, 2, headers.length); ws.getCell('A2').value = `Period: ${reportDate(report.range.start)} to ${reportDate(report.range.end)}. Currency: INR.`;
    ws.mergeCells(3, 1, 3, headers.length); ws.getCell('A3').value = name === 'Budgets' ? budgetNote : 'Source: transactions saved in Expenso at export time. Amounts retain two decimal places.'; ws.getCell('A3').alignment = { wrapText: true }; ws.getRow(3).height = 30;
    ws.getRow(5).values = headers; ws.getRow(5).height = 30;
    ws.getRow(5).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    rows.forEach(values => {
      const row = ws.addRow(values); row.height = Math.max(24, 16 * Math.max(...values.map((value, index) => typeof value === 'string' ? value.split('\n').reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / Math.max(12, widths[index] - 3))), 0) : 1)) + 10);
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const numeric = typeof cell.value === 'number';
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } }; cell.alignment = { vertical: 'top', wrapText: true, horizontal: numeric ? 'right' : 'left', indent: numeric ? 0 : 1 };
        if (row.number % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        if (moneyColumns.includes(col)) cell.numFmt = currency;
        if (percentColumns.includes(col)) cell.numFmt = '0.0%';
        if (cell.value instanceof Date) cell.numFmt = 'dd mmm yyyy';
      });
    });
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, ws.rowCount), column: headers.length } };
    ws.pageSetup.printArea = `A1:${ws.getColumn(headers.length).letter}${ws.rowCount}`;
    ws.headerFooter.oddFooter = '&LExpenso financial report&RPage &P of &N'; return ws;
  };
  sheet('Summary', ['Metric', 'Amount / Value', 'Definition'], [['Income', report.income, 'Income recorded in the selected period'], ['Expenses', report.expenses, 'Expenses recorded in the selected period'], ['Net savings', report.net, 'Income minus expenses; not the all-time balance'], ['Savings rate', report.savingsRate === null ? 'No income recorded' : report.savingsRate, 'Net savings divided by income'], ['Transactions', report.rows.length, 'Number of entries included']], [28, 27, 72], [2]);
  const summary = workbook.getWorksheet('Summary')!; summary.getCell('B9').numFmt = '0.0%'; summary.getCell('B10').numFmt = '0';
  sheet('Monthly', ['Month', 'Income (INR)', 'Expenses (INR)', 'Net savings (INR)'], report.monthly.map(m => [m.month, m.income, m.expenses, m.net]), [20, 27, 27, 27], [2, 3, 4]);
  sheet('Categories', ['Category', 'Income (INR)', 'Expenses (INR)', 'Expense share', 'Transactions'], report.categories.filter(c => c.count).map(c => [c.name, c.income, c.spent, c.share, c.count]), [35, 26, 26, 20, 18], [2, 3], [4]);
  sheet('Budgets', ['Category', 'Monthly limit (INR)', 'Period allocation (INR)', 'Spent (INR)', 'Remaining (INR)', 'Status'], report.categories.filter(c => c.limit !== null).map(c => [c.name, c.monthlyLimit, c.limit, c.spent, c.remaining, c.remaining! < 0 ? 'Over allocation' : 'Within allocation']), [35, 27, 29, 27, 27, 25], [2, 3, 4, 5]);
  const names = new Map(report.categories.map(c => [c.id, c.name]));
  sheet('Transactions', ['Date', 'Description', 'Category', 'Type', 'Amount (INR)', 'Repeat', 'Next occurrence', 'Transaction ID'], report.rows.map(t => [new Date(t.date + 'T00:00:00Z'), t.description || 'Untitled', names.get(t.category) ?? 'Uncategorized', t.type === 'income' ? 'Income' : 'Expense', t.amount, t.isRecurring ? t.recurringInterval ?? 'Yes' : 'No', t.nextRecurringDate ? new Date(t.nextRecurringDate + 'T00:00:00Z') : null, t.id]), [20, 65, 32, 15, 27, 18, 22, 42], [5]);
  return workbook;
}
