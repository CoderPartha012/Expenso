import React, { useState } from 'react';
import { useExpenseStore } from '../store';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Percent,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import TransactionList from './TransactionList';
import ExpenseChart from './ExpenseChart';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

const Dashboard = () => {
  const { transactions } = useExpenseStore();
  const [searchTerm, setSearchTerm] = useState('');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const monthlyTxns = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthTxns = transactions.filter(t => {
    const d = new Date(t.date);
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

  const getSparkline = (type: 'income' | 'expense' | 'net') =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = fmtDate(d);
      const dayTxns = transactions.filter(t => t.date === dateStr);
      let value = 0;
      if (type === 'income') value = dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      else if (type === 'expense') value = dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      else value = dayTxns.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
      return { value };
    });

  const metrics = [
    {
      title: 'Total Balance',
      value: fmt(totalBalance),
      trendLabel: balanceChange >= 0 ? `+${fmt(balanceChange)} this month` : `${fmt(balanceChange)} this month`,
      trendUp: balanceChange >= 0,
      sparkData: getSparkline('net'),
      gradient: 'from-blue-500 via-blue-600 to-indigo-700',
      glowColor: 'shadow-blue-500/30',
      strokeColor: '#93c5fd',
      icon: IndianRupee,
    },
    {
      title: 'Monthly Income',
      value: fmt(totalIncome),
      trendLabel: `${incomePct >= 0 ? '+' : ''}${incomePct.toFixed(1)}% vs last month`,
      trendUp: incomePct >= 0,
      sparkData: getSparkline('income'),
      gradient: 'from-emerald-500 via-emerald-600 to-green-700',
      glowColor: 'shadow-emerald-500/30',
      strokeColor: '#6ee7b7',
      icon: TrendingUp,
    },
    {
      title: 'Monthly Expenses',
      value: fmt(totalExpenses),
      trendLabel: `${expensePct >= 0 ? '+' : ''}${expensePct.toFixed(1)}% vs last month`,
      trendUp: expensePct <= 0,
      sparkData: getSparkline('expense'),
      gradient: 'from-rose-500 via-rose-600 to-red-700',
      glowColor: 'shadow-rose-500/30',
      strokeColor: '#fca5a5',
      icon: TrendingDown,
    },
    {
      title: 'Savings Rate',
      value: `${savingsRate.toFixed(1)}%`,
      trendLabel: `${savingsChange >= 0 ? '+' : ''}${savingsChange.toFixed(1)}% vs last month`,
      trendUp: savingsChange >= 0,
      sparkData: getSparkline('net'),
      gradient: 'from-violet-500 via-purple-600 to-purple-700',
      glowColor: 'shadow-violet-500/30',
      strokeColor: '#c4b5fd',
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-600" />
        </div>
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl shadow-sm border transition-colors duration-150
                     bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700
                     text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-xl p-5 shadow-lg ${metric.glowColor} bg-gradient-to-br ${metric.gradient} overflow-hidden`}
            >
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full bg-black/10" />

              {/* Header */}
              <div className="relative flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  {metric.title}
                </p>
                <div className="p-1.5 rounded-lg bg-white/20">
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Value */}
              <p className="relative text-2xl font-bold text-white mb-1">
                {metric.value}
              </p>

              {/* Trend badge */}
              <div className="relative flex items-center gap-1 mb-3">
                {metric.trendUp ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/90 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-white/60 flex-shrink-0" />
                )}
                <span className={`text-xs font-medium truncate ${metric.trendUp ? 'text-white/90' : 'text-white/60'}`}>
                  {metric.trendLabel}
                </span>
              </div>

              {/* Sparkline — last 7 days */}
              <div className="relative h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metric.sparkData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metric.strokeColor}
                      strokeWidth={2}
                      dot={false}
                      strokeOpacity={0.9}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts and Transaction List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionList dateRange="month" searchTerm={searchTerm} />
        </div>
        <div>
          <ExpenseChart />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
