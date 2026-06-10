import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X as XIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useExpenseStore } from '../store';

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const barColor = (pct: number) => {
  if (pct >= 0.80) return 'bg-rose-500';
  if (pct >= 0.60) return 'bg-amber-400';
  return 'bg-emerald-500';
};

const pctTextColor = (pct: number) => {
  if (pct >= 0.80) return 'text-rose-600 dark:text-rose-400';
  if (pct >= 0.60) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
};

const BudgetOverview = () => {
  const { categories, budgets, transactions, setBudget, deleteBudget } = useExpenseStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  const [addCatId,  setAddCatId]  = useState('');
  const [addVal,    setAddVal]    = useState('');

  const now          = new Date();
  const month        = now.getMonth();
  const year         = now.getFullYear();

  // Current-month expense spending per category
  const spending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type !== 'expense') return;
      const d = new Date(`${t.date}T00:00:00`);
      if (d.getMonth() !== month || d.getFullYear() !== year) return;
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return map;
  }, [transactions, month, year]);

  const rows = useMemo(() =>
    categories
      .map(cat => {
        const budget = budgets.find(b => b.categoryId === cat.id);
        const spent  = spending[cat.id] ?? 0;
        const pct    = budget ? Math.min(spent / budget.limit, 1.5) : null;
        return { cat, budget, spent, pct };
      })
      .filter(r => r.budget !== undefined),
    [categories, budgets, spending]
  );

  const unbudgetedCats = useMemo(
    () => categories.filter(cat => !budgets.find(b => b.categoryId === cat.id)),
    [categories, budgets]
  );

  const startEdit = (catId: string, currentLimit: number) => {
    setEditingId(catId);
    setEditVal(String(currentLimit));
  };

  const saveEdit = (catId: string) => {
    const val = parseFloat(editVal);
    if (!isNaN(val) && val > 0) setBudget({ categoryId: catId, limit: val });
    setEditingId(null);
    setEditVal('');
  };

  const cancelEdit = () => { setEditingId(null); setEditVal(''); };

  const openAdd = () => {
    setShowAdd(true);
    setAddCatId(unbudgetedCats[0]?.id ?? '');
    setAddVal('');
  };

  const handleAdd = () => {
    const val = parseFloat(addVal);
    if (!isNaN(val) && val > 0 && addCatId) {
      setBudget({ categoryId: addCatId, limit: val });
      setShowAdd(false);
      setAddVal('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Monthly Budgets</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{format(now, 'MMMM yyyy')}</p>
        </div>
        {unbudgetedCats.length > 0 && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                       bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400
                       hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add budget
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Empty state */}
        {rows.length === 0 && !showAdd && (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No budgets set yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                Set monthly limits per category. You'll get a warning when you hit 80%.
              </p>
            </div>
            {unbudgetedCats.length > 0 && (
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                           bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold
                           shadow-sm shadow-indigo-300/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Set your first budget
              </button>
            )}
          </div>
        )}

        {/* Budget rows — 2-col on sm+ */}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {rows.map(({ cat, budget, spent, pct }) => (
              <div key={cat.id}>
                {/* Row header */}
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Category dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />

                  {/* Name */}
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">
                    {cat.name}
                  </span>

                  {/* Pct badge */}
                  {pct !== null && editingId !== cat.id && (
                    <span className={`text-xs font-bold tabular-nums ${pctTextColor(pct)}`}>
                      {Math.round(Math.min(pct, 1) * 100)}%
                      {pct >= 0.80 && pct < 1.0 && ' ⚠️'}
                      {pct >= 1.0 && ' 🔴'}
                    </span>
                  )}

                  {/* Edit / Delete — shown when not editing this row */}
                  {editingId !== cat.id && (
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(cat.id, budget!.limit)}
                        title="Edit limit"
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81 3.23 11.33c-.03.031-.05.068-.063.11l-.652 2.278 2.278-.651a.25.25 0 0 0 .108-.063L11.19 6.25z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBudget(cat.id)}
                        title="Remove budget"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Amounts row / inline edit */}
                {editingId === cat.id ? (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(cat.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="w-28 px-2 py-1 rounded-lg border text-xs font-semibold tabular-nums
                                 bg-white dark:bg-slate-800
                                 border-indigo-300 dark:border-indigo-600
                                 text-slate-900 dark:text-slate-100
                                 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(cat.id)}
                      className="p-1 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(cat.id, budget!.limit)}
                    className="text-left text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-1.5
                               hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Click to edit limit"
                  >
                    {fmtINR(spent)} <span className="text-slate-300 dark:text-slate-600">of</span> {fmtINR(budget!.limit)} used
                  </button>
                )}

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((pct ?? 0) * 100, 100)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className={`h-full rounded-full ${barColor(pct ?? 0)}`}
                  />
                </div>

                {/* Over-budget note */}
                {(pct ?? 0) >= 1.0 && (
                  <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 font-medium">
                    Over by {fmtINR(spent - budget!.limit)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add budget form */}
        <AnimatePresence>
          {showAdd && unbudgetedCats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={rows.length > 0 ? 'pt-4 border-t border-slate-100 dark:border-slate-800' : ''}>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Set monthly limit for
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={addCatId}
                    onChange={e => setAddCatId(e.target.value)}
                    className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border text-sm
                               bg-slate-50 dark:bg-slate-800
                               border-slate-200 dark:border-slate-700
                               text-slate-800 dark:text-slate-200
                               focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {unbudgetedCats.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl border
                                  bg-slate-50 dark:bg-slate-800
                                  border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-sm font-medium">₹</span>
                    <input
                      type="number"
                      value={addVal}
                      onChange={e => setAddVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAdd();
                        if (e.key === 'Escape') { setShowAdd(false); setAddVal(''); }
                      }}
                      placeholder="5,000"
                      autoFocus
                      className="w-20 bg-transparent text-sm text-slate-800 dark:text-slate-200
                                 placeholder-slate-400 focus:outline-none tabular-nums"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAdd}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700
                               text-white text-xs font-semibold transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setAddVal(''); }}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700
                               text-slate-500 dark:text-slate-400 text-xs font-semibold
                               hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BudgetOverview;
