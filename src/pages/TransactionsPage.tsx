import React, { useState } from 'react';
import { Search } from 'lucide-react';
import TransactionList from '../components/TransactionList';

const TransactionsPage = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search all transactions..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border text-base
                     bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700
                     text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     transition-colors shadow-sm"
        />
      </div>
      <TransactionList dateRange="all" searchTerm={search} />
    </div>
  );
};

export default TransactionsPage;
