import type { Budget, Category, Transaction } from '../types';
export type ReportPreset = 'this-month' | 'last-month' | 'last-3m' | 'last-6m' | 'this-year' | 'all' | 'custom';
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T00:00:00').getTime()) && iso(new Date(value + 'T00:00:00')) === value;
export function reportRange(preset: ReportPreset, start: string, end: string, transactions: Transaction[], now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  if (preset === 'custom') return validDate(start) && validDate(end) && start <= end ? { start, end } : null;
  if (preset === 'all') {
    const dates = transactions.map(t => t.date).filter(validDate).sort();
    return { start: dates[0] ?? iso(new Date(y, m, 1)), end: dates[dates.length - 1] ?? iso(now) };
  }
  const offset = preset === 'last-month' ? 1 : preset === 'last-3m' ? 2 : preset === 'last-6m' ? 5 : 0;
  return { start: iso(new Date(y, preset === 'this-year' ? 0 : m - offset, 1)), end: iso(new Date(y, preset === 'this-year' ? 12 : preset === 'last-month' ? m : m + 1, 0)) };
}
const cents = (amount: number) => Math.round(amount * 100);
export function buildReport(transactions: Transaction[], categories: Category[], budgets: Budget[], range: { start: string; end: string }) {
  const rows = transactions.filter(t => validDate(t.date) && t.date >= range.start && t.date <= range.end).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const sum = (items: Transaction[]) => items.reduce((total, t) => total + cents(t.amount), 0) / 100;
  const income = sum(rows.filter(t => t.type === 'income')), expenses = sum(rows.filter(t => t.type === 'expense'));
  const monthly: { month: string; income: number; expenses: number; net: number }[] = [];
  let budgetMonths = 0;
  const cursor = new Date(range.start + 'T00:00:00'); cursor.setDate(1);
  while (iso(cursor).slice(0, 7) <= range.end.slice(0, 7)) {
    const month = iso(cursor).slice(0, 7);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const first = month === range.start.slice(0, 7) ? Number(range.start.slice(8)) : 1;
    const last = month === range.end.slice(0, 7) ? Number(range.end.slice(8)) : days;
    budgetMonths += (last - first + 1) / days;
    const items = rows.filter(t => t.date.slice(0, 7) === month);
    const mi = sum(items.filter(t => t.type === 'income')), me = sum(items.filter(t => t.type === 'expense'));
    monthly.push({ month, income: mi, expenses: me, net: Math.round((mi - me) * 100) / 100 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const ids = [...new Set([...categories.map(c => c.id), ...rows.map(t => t.category), ...budgets.map(b => b.categoryId)])];
  const categoryRows = ids.map(id => {
    const items = rows.filter(t => t.category === id);
    const spent = sum(items.filter(t => t.type === 'expense'));
    const budget = budgets.find(b => b.categoryId === id);
    const limit = budget && budget.limit > 0 ? Math.round(budget.limit * budgetMonths * 100) / 100 : null;
    return { id, name: categories.find(c => c.id === id)?.name ?? 'Uncategorized', income: sum(items.filter(t => t.type === 'income')), spent, count: items.length, share: expenses ? spent / expenses : 0, monthlyLimit: budget?.limit ?? null, limit, remaining: limit === null ? null : Math.round((limit - spent) * 100) / 100 };
  }).filter(c => c.count || c.limit !== null).sort((a, b) => b.spent - a.spent);
  return { range, rows, income, expenses, net: Math.round((income - expenses) * 100) / 100, savingsRate: income > 0 ? (income - expenses) / income : null, monthly, categories: categoryRows, budgetMonths };
}
export type Report = ReturnType<typeof buildReport>;
export const reportMoney = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
export const reportDate = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
