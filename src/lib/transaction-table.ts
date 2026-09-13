import type { Transaction } from '../types';

export type TableSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'description-asc';
export function sortTransactions(transactions: Transaction[], type: 'all' | 'income' | 'expense', sort: TableSort) {
  return transactions.filter(t => type === 'all' || t.type === type).sort((a, b) => {
    if (sort === 'amount-desc') return b.amount - a.amount || b.date.localeCompare(a.date);
    if (sort === 'amount-asc') return a.amount - b.amount || b.date.localeCompare(a.date);
    if (sort === 'description-asc') return a.description.localeCompare(b.description);
    return sort === 'date-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
  });
}
export function paginateTransactions(transactions: Transaction[], requestedPage: number, pageSize = 10) {
  const pages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pages));
  return { page, pages, rows: transactions.slice((page - 1) * pageSize, page * pageSize) };
}
export function togglePageSelection(selected: Set<string>, rows: Transaction[]) {
  const next = new Set(selected);
  const allSelected = rows.length > 0 && rows.every(t => selected.has(t.id));
  rows.forEach(t => allSelected ? next.delete(t.id) : next.add(t.id));
  return next;
}
export function transactionsCSV(transactions: Transaction[], categoryName: (id: string) => string) {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [['Description', 'Category', 'Type', 'Amount (INR)', 'Date', 'Recurring'], ...transactions.map(t => [t.description, categoryName(t.category), t.type, t.amount, t.date, t.isRecurring ? t.recurringInterval ?? 'Yes' : 'No'])].map(row => row.map(cell).join(',')).join('\r\n');
}
