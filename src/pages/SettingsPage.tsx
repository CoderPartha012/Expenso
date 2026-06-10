import React from 'react';
import { Sun, Moon, Info } from 'lucide-react';
import { useExpenseStore } from '../store';

const SettingsPage = () => {
  const { theme, toggleTheme, transactions } = useExpenseStore();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Appearance */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark'
              ? <Moon className="h-5 w-5 text-indigo-400" />
              : <Sun className="h-5 w-5 text-amber-400" />}
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </p>
              <p className="text-xs text-slate-400">Toggle the app colour scheme</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
              theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Data */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Data</h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} stored
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Saved locally in your browser</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">About</h2>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-slate-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Expenso</p>
            <p className="text-xs text-slate-400">Personal finance tracker · v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
