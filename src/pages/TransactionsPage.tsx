import { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import TransactionList from '../components/TransactionList';
import ImportModal from '../components/ImportModal';

const TransactionsPage = () => {
  const [search,     setSearch]     = useState('');
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search + Import row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
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

        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium
                     bg-white dark:bg-slate-900
                     border-slate-200 dark:border-slate-700
                     text-slate-600 dark:text-slate-400
                     hover:border-indigo-300 dark:hover:border-indigo-600
                     hover:text-indigo-600 dark:hover:text-indigo-400
                     hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                     transition-all shadow-sm whitespace-nowrap"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      <TransactionList dateRange="all" searchTerm={search} />

      <AnimatePresence>
        {showImport && (
          <ImportModal onClose={() => setShowImport(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionsPage;
