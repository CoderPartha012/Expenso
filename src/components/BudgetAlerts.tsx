import React, { useState } from 'react';
import { useExpenseStore } from '../store';
import { AlertTriangle } from 'lucide-react';

const BudgetAlerts = () => {
  const { transactions, categories, budgets, setBudget } = useExpenseStore();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');

  const getCategoryExpenses = (categoryId: string) => {
    return transactions
      .filter(t => t.category === categoryId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleSetBudget = (categoryId: string) => {
    const amount = parseFloat(editingAmount);
    if (!isNaN(amount) && amount > 0) {
      setBudget({ categoryId, limit: amount });
      setEditingCategory(null);
      setEditingAmount('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Budget Alerts</h2>
      </div>
      <div className="space-y-6">
        {categories.map(category => {
          const budget = budgets.find(b => b.categoryId === category.id);
          const expenses = getCategoryExpenses(category.id);
          const percentage = budget ? (expenses / budget.limit) * 100 : 0;

          return (
            <div key={category.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900 dark:text-white">{category.name}</span>
                {editingCategory === category.id ? (
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={editingAmount}
                      onChange={(e) => setEditingAmount(e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="Amount"
                    />
                    <button
                      onClick={() => handleSetBudget(category.id)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm"
                    >
                      Set
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingCategory(category.id);
                      setEditingAmount(budget?.limit.toString() || '');
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                  >
                    {budget ? 'Edit' : 'Set Budget'}
                  </button>
                )}
              </div>
              {budget && (
                <>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage > 90 ? 'bg-rose-600' :
                        percentage > 70 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR'
                      }).format(expenses)}
                      {' / '}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR'
                      }).format(budget.limit)}
                    </span>
                    <span className={`font-medium ${
                      percentage > 90 ? 'text-rose-600 dark:text-rose-400' :
                      percentage > 70 ? 'text-amber-600 dark:text-amber-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetAlerts;