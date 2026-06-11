import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Edit2, Trash2, Check, X,
  Calendar, Hash, Tag, Clock, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useExpenseStore } from '../store';
import { Transaction, TransactionLog } from '../types';

// ── Shared constants ──────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  utensils:          '🍔',
  car:               '🚗',
  'file-text':       '📄',
  'shopping-bag':    '🛍️',
  tv:                '🎮',
  heart:             '❤️',
  wallet:            '💰',
  'more-horizontal': '•••',
  home:              '🏠',
  coffee:            '☕',
  phone:             '📱',
  music:             '🎵',
  plane:             '✈️',
  book:              '📚',
  gift:              '🎁',
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);

const fmtDateTime = (iso?: string): string => {
  if (!iso) return '—';
  try { return format(new Date(iso), 'dd MMM yyyy, h:mm a'); }
  catch { return '—'; }
};

const fmtDate = (dateStr: string): string => {
  try { return format(new Date(`${dateStr}T00:00:00`), 'dd MMM yyyy'); }
  catch { return dateStr; }
};

// ── Sub-components ────────────────────────────────────────────────────────────

const DetailRow = ({ icon: Icon, label, children }: {
  icon: React.FC<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
    <Icon className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-24 flex-shrink-0 mt-0.5">
      {label}
    </span>
    <span className="text-sm text-slate-800 dark:text-slate-200 flex-1 min-w-0">
      {children}
    </span>
  </div>
);

const LogEntry = ({ log, isLast }: { log: TransactionLog; isLast: boolean }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center flex-shrink-0">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 ring-2 ${
        log.action === 'created'
          ? 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-900/40'
          : 'bg-slate-300 dark:bg-slate-600 ring-slate-100 dark:ring-slate-800'
      }`} />
      {!isLast && <div className="w-px flex-1 bg-slate-100 dark:bg-slate-800 mt-1 min-h-[28px]" />}
    </div>

    <div className={`flex-1 min-w-0 ${!isLast ? 'pb-5' : ''}`}>
      {log.action === 'created' ? (
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Transaction created</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {log.field} updated
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800
                             text-slate-500 dark:text-slate-400 line-through font-mono">
              {log.oldValue}
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">→</span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30
                             text-indigo-700 dark:text-indigo-300 font-semibold">
              {log.newValue}
            </span>
          </div>
        </>
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        {fmtDateTime(log.timestamp)}
      </p>
    </div>
  </div>
);

// ── Edit modal (portal) ───────────────────────────────────────────────────────

interface EditModalProps {
  transaction: Transaction;
  onSave:  (updates: Pick<Transaction, 'amount' | 'type' | 'category' | 'description' | 'date'>) => void;
  onClose: () => void;
}

const EditModal = ({ transaction, onSave, onClose }: EditModalProps) => {
  const { categories } = useExpenseStore();

  const [form, setForm] = useState({
    amount:      String(transaction.amount),
    type:        transaction.type,
    category:    transaction.category,
    description: transaction.description,
    date:        transaction.date,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputBase = `w-full px-4 py-3 rounded-2xl border text-sm transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                     bg-slate-50 dark:bg-slate-800
                     border-slate-100 dark:border-slate-700
                     text-slate-900 dark:text-slate-100
                     placeholder-slate-300 dark:placeholder-slate-600`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Enter a valid amount';
    if (!form.description.trim()) e.description = 'Required';
    if (!form.date) e.date = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      amount:      parseFloat(form.amount),
      type:        form.type,
      category:    form.category,
      description: form.description.trim(),
      date:        form.date,
    });
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl
                   shadow-2xl border border-slate-100 dark:border-slate-800
                   max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Edit Transaction</h2>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Type toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t === 'expense' ? '📉 Expense' : '📈 Income'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-light">₹</span>
              <input
                type="number" min="0" step="any"
                value={form.amount}
                onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(v => ({ ...v, amount: '' })); }}
                className={`${inputBase} pl-9 text-xl font-bold tabular-nums ${errors.amount ? 'border-rose-300 dark:border-rose-700' : ''}`}
              />
            </div>
            {errors.amount && <p className="mt-1 text-xs text-rose-500">{errors.amount}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => {
                const sel = form.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-150 ${
                      sel ? 'shadow-sm' : 'border-slate-100 dark:border-slate-800'
                    }`}
                    style={sel ? { borderColor: cat.color, backgroundColor: cat.color + '15' } : {}}
                  >
                    <span className="text-xl leading-none">{CATEGORY_EMOJI[cat.icon] ?? '📦'}</span>
                    <span className={`text-[10px] font-semibold text-center leading-tight ${
                      sel ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
                    }`}>{cat.name}</span>
                    {sel && (
                      <div
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(v => ({ ...v, description: '' })); }}
              placeholder="What was this for?"
              className={`${inputBase} ${errors.description ? 'border-rose-300 dark:border-rose-700' : ''}`}
            />
            {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setErrors(v => ({ ...v, date: '' })); }}
              className={`${inputBase} ${errors.date ? 'border-rose-300 dark:border-rose-700' : ''}`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold transition-colors
                       border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400
                       hover:border-slate-200 dark:hover:border-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700
                       text-white text-sm font-semibold shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const TransactionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactions, categories, updateTransaction, deleteTransaction } = useExpenseStore();

  const transaction = transactions.find(t => t.id === id);

  const [isEditing,       setIsEditing]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!transaction) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto text-center py-24 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Transaction not found</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
          This transaction may have been deleted.
        </p>
        <button
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-medium rounded-2xl shadow-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </button>
      </motion.div>
    );
  }

  const cat       = categories.find(c => c.id === transaction.category);
  const displayId = `${transaction.type === 'income' ? 'INC' : 'EXP'}-${transaction.id.slice(0, 8).toUpperCase()}`;
  const logs      = [...(transaction.logs ?? [])].reverse(); // newest first

  const isIncome  = transaction.type === 'income';
  const heroGrad  = isIncome
    ? 'from-emerald-500 via-emerald-600 to-green-700'
    : 'from-rose-500 via-rose-600 to-red-700';
  const heroGlow  = isIncome ? 'shadow-emerald-500/30' : 'shadow-rose-500/30';

  const handleSaveEdit = (
    updates: Pick<Transaction, 'amount' | 'type' | 'category' | 'description' | 'date'>,
  ) => {
    updateTransaction({ ...transaction, ...updates });
    setIsEditing(false);
    toast.success('Transaction updated');
  };

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    toast.success('Transaction deleted');
    navigate('/transactions');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="max-w-lg mx-auto space-y-4"
      >
        {/* ── Top nav bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium
                         border-slate-200 dark:border-slate-700
                         text-slate-600 dark:text-slate-400
                         hover:border-indigo-300 dark:hover:border-indigo-600
                         hover:text-indigo-600 dark:hover:text-indigo-400
                         hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                         transition-all"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium
                         border-slate-200 dark:border-slate-700
                         text-slate-600 dark:text-slate-400
                         hover:border-rose-300 dark:hover:border-rose-700
                         hover:text-rose-600 dark:hover:text-rose-400
                         hover:bg-rose-50 dark:hover:bg-rose-900/20
                         transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <div className={`relative rounded-2xl p-6 shadow-lg ${heroGlow} bg-gradient-to-br ${heroGrad} overflow-hidden`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-6 w-24 h-24 rounded-full bg-black/10" />

          <div className="relative">
            {/* Type badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                             bg-white/20 text-white/90 text-xs font-semibold mb-4">
              {isIncome ? '📈 Income' : '📉 Expense'}
            </span>

            {/* Amount */}
            <p className="text-4xl font-bold text-white mb-1 tabular-nums">
              {isIncome ? '+' : '−'}{fmtINR(transaction.amount)}
            </p>

            {/* Description */}
            <p className="text-white/90 text-base font-medium leading-snug mt-1">
              {transaction.description || 'Untitled transaction'}
            </p>

            {/* Date */}
            <p className="text-white/60 text-sm mt-1.5">
              {fmtDate(transaction.date)}
            </p>
          </div>
        </div>

        {/* ── Details card ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Details
            </p>
          </div>
          <div className="px-5 py-1">
            <DetailRow icon={Hash} label="ID">
              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-400">
                {displayId}
              </span>
            </DetailRow>

            <DetailRow icon={Tag} label="Category">
              <span className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-black/5"
                  style={{ backgroundColor: cat?.color ?? '#94a3b8' }}
                />
                <span>
                  {CATEGORY_EMOJI[cat?.icon ?? ''] ?? '📦'} {cat?.name ?? 'Uncategorized'}
                </span>
              </span>
            </DetailRow>

            <DetailRow icon={Calendar} label="Date">
              {fmtDate(transaction.date)}
              {transaction.isRecurring && (
                <span className="ml-2 text-xs text-indigo-500 font-medium">
                  ↺ {transaction.recurringInterval}
                </span>
              )}
            </DetailRow>

            <DetailRow icon={Clock} label="Added on">
              {fmtDateTime(transaction.createdAt)}
            </DetailRow>

            {transaction.updatedAt && (
              <DetailRow icon={Edit2} label="Last edited">
                {fmtDateTime(transaction.updatedAt)}
              </DetailRow>
            )}
          </div>
        </div>

        {/* ── Activity log ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Activity
            </p>
          </div>
          <div className="px-5 pt-4 pb-2">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
                No activity recorded
              </p>
            ) : (
              logs.map((log, i) => (
                <LogEntry key={log.id} log={log} isLast={i === logs.length - 1} />
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isEditing && (
          <EditModal
            transaction={transaction}
            onSave={handleSaveEdit}
            onClose={() => setIsEditing(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{    opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800
                         w-full max-w-sm p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Delete this transaction?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {transaction.description || 'Untitled'}
                </span>{' '}
                will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold
                             border-slate-100 dark:border-slate-800
                             text-slate-500 dark:text-slate-400
                             hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700
                             text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TransactionDetailPage;
