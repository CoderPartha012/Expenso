import React, { useState } from 'react';
import { useExpenseStore } from '../store';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, TrendingDown, Percent, Search } from 'lucide-react';
import TransactionList from './TransactionList';
import ExpenseChart from './ExpenseChart';

const Dashboard = () => {
  const { transactions } = useExpenseStore();
  const [searchTerm, setSearchTerm] = useState('');

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = transactions
    .reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const metrics = [
    {
      title: 'Total Balance',
      amount: totalBalance,
      icon: <IndianRupee className="h-6 w-6 text-white" />,
      color: 'from-blue-600 to-blue-700'
    },
    {
      title: 'Monthly Income',
      amount: totalIncome,
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      color: 'from-green-600 to-green-700'
    },
    {
      title: 'Monthly Expenses',
      amount: totalExpenses,
      icon: <TrendingDown className="h-6 w-6 text-white" />,
      color: 'from-rose-600 to-rose-700'
    },
    {
      title: 'Savings Rate',
      amount: savingsRate,
      icon: <Percent className="h-6 w-6 text-white" />,
      color: 'from-purple-600 to-purple-700',
      isPercentage: true
    }
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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600">{metric.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {metric.isPercentage ? (
                    `${metric.amount.toFixed(1)}%`
                  ) : (
                    new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(metric.amount)
                  )}
                </p>
              </div>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color}`}>
                {metric.icon}
              </div>
            </div>
          </motion.div>
        ))}
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

export default Dashboard