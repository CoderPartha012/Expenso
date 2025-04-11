import React, { useState } from 'react';
import { useExpenseStore } from '../store';
import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parse } from 'date-fns';
import { DateRange, Transaction, FilterState } from '../types';
import { Edit2, Trash2, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  dateRange: DateRange;
  searchTerm: string;
}

const TransactionList: React.FC<Props> = ({ dateRange, searchTerm }) => {
  const { transactions, categories, deleteTransaction } = useExpenseStore();
  const [filters, setFilters] = useState<FilterState>({
    date: '',
    category: '',
    description: '',
    amount: '',
    type: 'all',
  });
  const [activeFilter, setActiveFilter] = useState<keyof FilterState | null>(null);

  const getDateRange = (range: DateRange) => {
    const now = new Date();
    switch (range) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    // Date range filter from props
    if (dateRange !== 'all') {
      const range = getDateRange(dateRange);
      if (range && !isWithinInterval(new Date(transaction.date), range)) {
        return false;
      }
    }

    // Global search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const category = categories.find(c => c.id === transaction.category)?.name.toLowerCase() || '';
      const description = transaction.description.toLowerCase();
      const amount = transaction.amount.toString();
      
      return description.includes(searchLower) || 
             category.includes(searchLower) || 
             amount.includes(searchLower);
    }

    // Column-specific filters
    if (filters.date) {
      const transactionDate = format(new Date(transaction.date), 'yyyy-MM-dd');
      if (!transactionDate.includes(filters.date)) return false;
    }

    if (filters.category) {
      const category = categories.find(c => c.id === transaction.category)?.name.toLowerCase();
      if (!category?.includes(filters.category.toLowerCase())) return false;
    }

    if (filters.description) {
      if (!transaction.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
    }

    if (filters.amount) {
      const amount = transaction.amount.toString();
      if (!amount.includes(filters.amount)) return false;
    }

    if (filters.type !== 'all') {
      if (transaction.type !== filters.type) return false;
    }

    return true;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const renderFilterPopup = (field: keyof FilterState) => {
    if (activeFilter !== field) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute z-10 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 min-w-[200px]"
      >
        {field === 'type' ? (
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as FilterState['type'] })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        ) : field === 'category' ? (
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field === 'date' ? 'date' : field === 'amount' ? 'number' : 'text'}
            value={filters[field]}
            onChange={(e) => setFilters({ ...filters, [field]: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            placeholder={`Filter by ${field}`}
          />
        )}
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setActiveFilter(null)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  };

  const renderColumnHeader = (title: string, field: keyof FilterState) => {
    const hasFilter = filters[field] !== '' && filters[field] !== 'all';

    return (
      <th className="px-6 py-3 text-left relative">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {title}
          </span>
          <button
            onClick={() => setActiveFilter(activeFilter === field ? null : field)}
            className={`p-1 rounded-lg transition-colors ${
              hasFilter ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <Filter className="h-3 w-3" />
          </button>
          {hasFilter && (
            <button
              onClick={() => setFilters({ ...filters, [field]: field === 'type' ? 'all' : '' })}
              className="p-1 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <AnimatePresence>
          {renderFilterPopup(field)}
        </AnimatePresence>
      </th>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              {renderColumnHeader('Date', 'date')}
              {renderColumnHeader('Category', 'category')}
              {renderColumnHeader('Description', 'description')}
              {renderColumnHeader('Type', 'type')}
              {renderColumnHeader('Amount', 'amount')}
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                    {format(new Date(transaction.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                    {categories.find(c => c.id === transaction.category)?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatAmount(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;