import type { Category, Transaction } from '../types';

export function buildAnalytics(transactions: Transaction[], categories: Category[], month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const line = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, monthNumber - 6 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const rows = transactions.filter(t => t.date.slice(0, 7) === key);
    const income = rows.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = rows.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { month: key, label: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), income, expenses, savings: income - expenses };
  });
  const expenses = transactions.filter(t => t.type === 'expense' && t.date.slice(0, 7) === month);
  const groups = new Map<string, number>();
  expenses.forEach(t => groups.set(t.category, (groups.get(t.category) ?? 0) + t.amount));
  const palette = ['#2563eb', '#16a34a', '#eab308', '#a3a3a3', '#7c3aed', '#f97316', '#06b6d4'];
  const donut = [...groups.entries()].map(([id, value], index) => ({ id, value, label: categories.find(c => c.id === id)?.name ?? 'Uncategorized', color: categories.find(c => c.id === id)?.color || palette[index % palette.length] })).filter(t => t.value > 0).sort((a, b) => b.value - a.value);
  return { line, donut, total: donut.reduce((sum, item) => sum + item.value, 0), hasLineData: transactions.some(t => line.some(point => t.date.slice(0, 7) === point.month)) };
}

export const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
