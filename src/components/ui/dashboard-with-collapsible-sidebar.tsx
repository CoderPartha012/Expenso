import { useState } from 'react';
import { useExpenseStore } from '../../store';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Sun, Moon, Bell, User,
} from 'lucide-react';


const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

export const Example = () => {
  const { transactions, categories, budgets, theme, toggleTheme } = useExpenseStore();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const localDate = (s: string) => new Date(`${s}T00:00:00`);

  const monthlyTxns = transactions.filter(t => {
    const d = localDate(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthTxns = transactions.filter(t => {
    const d = localDate(t.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const totalIncome = monthlyTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthlyTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const lastIncome = lastMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const lastExpenses = lastMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastSavingsRate = lastIncome > 0 ? ((lastIncome - lastExpenses) / lastIncome) * 100 : 0;

  const thisMonthNet = totalIncome - totalExpenses;
  const lastMonthNet = lastIncome - lastExpenses;
  const balanceChange = thisMonthNet - lastMonthNet;
  const incomePct = lastIncome > 0 ? ((totalIncome - lastIncome) / lastIncome) * 100 : 0;
  const expensePct = lastExpenses > 0 ? ((totalExpenses - lastExpenses) / lastExpenses) * 100 : 0;
  const savingsChange = savingsRate - lastSavingsRate;

  const metrics = [
    {
      title: 'Total Balance',
      value: fmt(totalBalance),
      trendLabel: balanceChange >= 0 ? `+${fmt(balanceChange)} this month` : `${fmt(balanceChange)} this month`,
      trendUp: balanceChange >= 0,
      icon: IndianRupee,
    },
    {
      title: 'Monthly Income',
      value: fmt(totalIncome),
      trendLabel: `${incomePct >= 0 ? '+' : ''}${incomePct.toFixed(1)}% vs last month`,
      trendUp: incomePct >= 0,
      icon: TrendingUp,
    },
    {
      title: 'Monthly Expenses',
      value: fmt(totalExpenses),
      trendLabel: `${expensePct >= 0 ? '+' : ''}${expensePct.toFixed(1)}% vs last month`,
      trendUp: expensePct <= 0,
      icon: TrendingDown,
    },
    {
      title: 'Savings Rate',
      value: `${savingsRate.toFixed(1)}%`,
      trendLabel: `${savingsChange >= 0 ? '+' : ''}${savingsChange.toFixed(1)}% vs last month`,
      trendUp: savingsChange >= 0,
      icon: Percent,
    },
  ];

  const [showAlerts, setShowAlerts] = useState(false);
  const recent = [...transactions].sort((a,b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0,5);
  const top = categories.map(c => ({ ...c, total: monthlyTxns.filter(t => t.type === 'expense' && t.category === c.id).reduce((sum,t) => sum+t.amount,0) })).filter(c => c.total > 0).sort((a,b) => b.total-a.total).slice(0,4);
  const budgetLimit = budgets.reduce((sum,b) => sum+b.limit,0);
  const budgetSpent = monthlyTxns.filter(t => t.type === 'expense' && budgets.some(b => b.categoryId === t.category)).reduce((sum,t) => sum+t.amount,0);
  const alerts = budgets.filter(b => monthlyTxns.filter(t => t.type === 'expense' && t.category === b.categoryId).reduce((sum,t) => sum+t.amount,0) >= b.limit);
  const stats = [
    { label: 'Savings rate', value: totalIncome > 0 ? savingsRate.toFixed(1)+'%' : 'No income yet', progress: savingsRate, color: 'bg-blue-500' },
    { label: 'Income spent', value: totalIncome > 0 ? (totalExpenses/totalIncome*100).toFixed(1)+'%' : 'No income yet', progress: totalIncome > 0 ? totalExpenses/totalIncome*100 : 0, color: 'bg-orange-500' },
    { label: 'Budget used', value: budgetLimit > 0 ? (budgetSpent/budgetLimit*100).toFixed(1)+'%' : 'No budgets set', progress: budgetLimit > 0 ? budgetSpent/budgetLimit*100 : 0, color: 'bg-green-500' },
  ];
  const tints = ['bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400','bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400','bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400','bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'];
  const panel = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm';
  const action = 'grid size-10 place-content-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';
  return <div className="space-y-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-1 text-gray-600 dark:text-gray-400">Welcome back to your dashboard</p></div><div className="flex items-center gap-4">
      <button type="button" aria-label="Budget notifications" aria-expanded={showAlerts} onClick={() => setShowAlerts(!showAlerts)} className={action+' relative'}><Bell className="h-5 w-5" />{alerts.length > 0 && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-red-500" />}</button>
      <button type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme} className={action}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
      <Link to="/settings" aria-label="Account settings" className={action}><User className="h-5 w-5" /></Link>
    </div></header>
    {showAlerts && <section aria-label="Budget notifications" className={panel}>{alerts.length ? <ul className="space-y-2 text-sm">{alerts.map(b => <li key={b.categoryId}>{categories.find(c => c.id === b.categoryId)?.name ?? 'Category'} has reached its {fmt(b.limit)} monthly budget.</li>)}</ul> : <p className="text-sm text-gray-500 dark:text-gray-400">No budget alerts this month.</p>}</section>}
    <div id="tour-metrics" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">{metrics.map((metric,i) => { const Icon=metric.icon; return <section key={metric.title} className={panel+' hover:shadow-md transition-shadow'}><div className="flex items-center justify-between mb-4"><div className={tints[i]+' p-2 rounded-lg'}><Icon className="h-5 w-5" /></div>{metric.trendUp ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}</div><h2 className="font-medium text-gray-600 dark:text-gray-400 mb-1">{metric.title}</h2><p className="text-2xl font-bold tabular-nums">{metric.value}</p><p className={(metric.trendUp ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400')+' text-sm mt-1'}>{metric.trendLabel}</p></section>; })}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <section id="tour-transactions" className={panel+' lg:col-span-2 self-start'}><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-semibold">Recent Activity</h2><Link to="/transactions" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View all</Link></div>
        <div className="space-y-4">{recent.length ? recent.map(t => <Link key={t.id} to={'/transaction/'+t.id} className="flex items-center gap-4 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800"><div className={(t.type === 'income' ? tints[1] : tints[0])+' p-2 rounded-lg'}><IndianRupee className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{t.description || (t.type === 'income' ? 'Income recorded' : 'Expense recorded')}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate">{categories.find(c => c.id === t.category)?.name ?? 'Uncategorized'} | {new Date(t.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p></div><span className="text-sm font-medium tabular-nums whitespace-nowrap">{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</span></Link>) : <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No activity yet. Add a transaction to get started.</p>}</div>
      </section>
      <div className="space-y-6"><section id="tour-stats" className={panel}><h2 className="text-lg font-semibold mb-4">Quick Stats</h2><div className="space-y-4">{stats.map(stat => <div key={stat.label}><div className="flex justify-between gap-2 text-sm mb-2"><span className="text-gray-600 dark:text-gray-400">{stat.label}</span><span className="font-medium">{stat.value}</span></div><div role="progressbar" aria-label={stat.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,stat.progress))} className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className={stat.color+' h-full rounded-full'} style={{width:Math.max(0,Math.min(100,stat.progress))+'%'}} /></div></div>)}</div></section>
      <section className={panel}><h2 className="text-lg font-semibold mb-4">Top Spending Categories</h2>{top.length ? <dl className="space-y-3">{top.map(c => <div key={c.id} className="flex justify-between gap-3 py-2 text-sm"><dt className="text-gray-600 dark:text-gray-400">{c.name}</dt><dd className="font-medium tabular-nums">{fmt(c.total)}</dd></div>)}</dl> : <p className="text-sm text-gray-500 dark:text-gray-400">No expenses this month.</p>}</section></div>
    </div>
  </div>;
};
export default Example;
