import React, { useState, useEffect, useRef } from 'react';
import { useExpenseStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

// ─── Category icon → emoji map ────────────────────────────────────────────────
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

// ─── Payment methods ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'cash',       label: 'Cash',        emoji: '💵' },
  { value: 'card',       label: 'Card',         emoji: '💳' },
  { value: 'upi',        label: 'UPI',          emoji: '📱' },
  { value: 'netbanking', label: 'Net Banking',  emoji: '🌐' },
] as const;

type RecurringInterval = 'weekly' | 'monthly' | 'yearly';

const RECURRING_OPTIONS: { value: RecurringInterval; label: string }[] = [
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
];

// ─── Main component ───────────────────────────────────────────────────────────
const AddTransaction = () => {
  const { categories, addTransaction } = useExpenseStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    amount:        '',
    type:          'expense' as 'income' | 'expense',
    category:      categories[0]?.id ?? '',
    description:   '',
    date:          (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
    paymentMethod: 'upi' as string,
  });

  const [isRecurring,        setIsRecurring]        = useState(false);
  const [recurringInterval,  setRecurringInterval]  = useState<RecurringInterval>('monthly');
  const [errors,             setErrors]             = useState<Record<string, string>>({});

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate('/'); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  // Clear a single field's error the moment the user edits it.
  const clearErr = (field: string) =>
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (!formData.category) errs.category = 'Select a category';
    if (!formData.date) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cat = categories.find(c => c.id === formData.category);
    addTransaction({
      amount:            parseFloat(formData.amount),
      type:              formData.type,
      category:          formData.category,
      description:       formData.description.trim(),
      date:              formData.date,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
    });
    toast.success('Transaction added', {
      description: `${formData.type === 'income' ? '+' : '−'}₹${parseFloat(formData.amount).toLocaleString('en-IN')} · ${cat?.name ?? ''}`,
    });
    navigate('/');
  };

  const inputBase = `w-full px-4 py-3 rounded-2xl border text-base sm:text-sm transition-colors
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                     bg-slate-50 dark:bg-slate-800
                     border-slate-100 dark:border-slate-700
                     text-slate-900 dark:text-slate-100
                     placeholder-slate-300 dark:placeholder-slate-600`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Transaction</h2>
          <span className="ml-auto text-xs text-slate-300 dark:text-slate-600">Esc to cancel</span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Type toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData(f => ({ ...f, type: t }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  formData.type === t
                    ? t === 'expense'
                      ? 'bg-rose-500 text-white shadow-sm shadow-rose-200/50'
                      : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t === 'expense' ? '📉 Expense' : '📈 Income'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className={`rounded-2xl border-2 transition-colors px-6 py-5 text-center ${
            errors.amount
              ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20'
              : formData.type === 'income'
                ? 'border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-900/10'
                : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
          }`}>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Amount</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-3xl font-light ${
                formData.type === 'income' ? 'text-emerald-400' : 'text-slate-300 dark:text-slate-600'
              }`}>₹</span>
              <input
                ref={amountRef}
                type="number"
                min="0"
                step="any"
                value={formData.amount}
                onChange={e => { setFormData(f => ({ ...f, amount: e.target.value })); clearErr('amount'); }}
                placeholder="0"
                inputMode="decimal"
                className={`w-48 text-5xl font-bold bg-transparent border-none outline-none text-center tabular-nums
                            placeholder:text-slate-200 dark:placeholder:text-slate-700 ${
                  formData.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              />
            </div>
            {errors.amount && <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">{errors.amount}</p>}
          </div>

          {/* Category grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Category
              {errors.category && <span className="text-rose-500 ml-1 normal-case font-normal">— {errors.category}</span>}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => {
                const selected = formData.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setFormData(f => ({ ...f, category: cat.id })); clearErr('category'); }}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-150 ${
                      selected
                        ? 'shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                    style={selected ? { borderColor: cat.color, backgroundColor: cat.color + '15' } : {}}
                  >
                    <span className="text-2xl leading-none">{CATEGORY_EMOJI[cat.icon] ?? '📦'}</span>
                    <span className={`text-[10px] font-semibold text-center leading-tight ${
                      selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {cat.name}
                    </span>
                    {selected && (
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
              value={formData.description}
              onChange={e => { setFormData(f => ({ ...f, description: e.target.value })); clearErr('description'); }}
              placeholder="What was this for?"
              className={`${inputBase} ${errors.description ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20' : ''}`}
            />
            {errors.description && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{errors.description}</p>}
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => {
                const active = formData.paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, paymentMethod: m.value }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all duration-150 ${
                      active
                        ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl leading-none">{m.emoji}</span>
                    <span className={`text-[10px] font-semibold ${
                      active ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={e => { setFormData(f => ({ ...f, date: e.target.value })); clearErr('date'); }}
              className={`${inputBase} ${errors.date ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20' : ''}`}
            />
            {errors.date && <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{errors.date}</p>}
          </div>

          {/* Recurring toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl border
                            bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Make this recurring?</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Auto-add on a schedule</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurring(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                  isRecurring ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isRecurring ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <AnimatePresence>
              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-1">
                    {RECURRING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurringInterval(opt.value)}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-2xl border-2 transition-all duration-150 ${
                          recurringInterval === opt.value
                            ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold transition-colors
                         border-slate-100 dark:border-slate-800
                         text-slate-500 dark:text-slate-400
                         hover:border-slate-200 dark:hover:border-slate-700
                         hover:text-slate-700 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold text-white shadow-sm transition-all ${
                formData.type === 'income'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/50 dark:shadow-emerald-900/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50 dark:shadow-indigo-900/30'
              }`}
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AddTransaction;
