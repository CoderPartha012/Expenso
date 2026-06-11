import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useExpenseStore } from '../store';
import {
  format,
  isWithinInterval,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  isToday, isYesterday,
} from 'date-fns';
import { DateRange, Transaction, FilterState } from '../types';
import { Trash2, Check, PlusCircle, Receipt, Filter, X, AlertTriangle, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
  dateRange: DateRange;
  searchTerm: string;
}

// ─── Skeleton shimmer row ─────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-5 py-4 animate-pulse">
    <div className="w-[18px] h-[18px] rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
    <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/5" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
    </div>
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 flex-shrink-0" />
    <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
        <Receipt className="h-10 w-10 text-indigo-400 dark:text-indigo-500" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-md">
        <span className="text-white text-lg font-bold leading-none select-none">+</span>
      </div>
    </div>
    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1.5">No transactions yet</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
      Start tracking your finances by adding your first income or expense.
    </p>
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white
                 text-sm font-medium rounded-2xl shadow-sm shadow-indigo-200 transition-colors"
    >
      <PlusCircle className="h-4 w-4" />
      Add your first transaction
    </button>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const TransactionList: React.FC<Props> = ({ dateRange, searchTerm }) => {
  const { transactions, categories, deleteTransaction, updateTransaction, addTransaction } = useExpenseStore();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>({
    date: '', category: '', description: '', amount: '', type: 'all',
  });
  const [filterOpen, setFilterOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  type DeleteDialog =
    | { kind: 'single'; transaction: Transaction }
    | { kind: 'bulk';   ids: string[] }
    | null;

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editAmount,  setEditAmount]  = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const boundsMap: Record<string, { start: Date; end: Date } | null> = {
      day:   { start: startOfDay(now),   end: endOfDay(now) },
      week:  { start: startOfWeek(now),  end: endOfWeek(now) },
      month: { start: startOfMonth(now), end: endOfMonth(now) },
      all:   null,
    };
    const bounds = boundsMap[dateRange] ?? null;
    const localDate = (s: string) => { const d = new Date(`${s}T00:00:00`); return isNaN(d.getTime()) ? null : d; };
    return transactions.filter(t => {
      const d = localDate(t.date);
      if (!d) return false;
      if (bounds && !isWithinInterval(d, bounds)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const cat = categories.find(c => c.id === t.category)?.name.toLowerCase() || '';
        return t.description.toLowerCase().includes(q) || cat.includes(q) || t.amount.toString().includes(q);
      }
      if (filters.date && !format(d, 'yyyy-MM-dd').includes(filters.date)) return false;
      if (filters.category) {
        const cat = categories.find(c => c.id === t.category)?.name.toLowerCase();
        if (!cat?.includes(filters.category.toLowerCase())) return false;
      }
      if (filters.description && !t.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
      if (filters.amount && !t.amount.toString().includes(filters.amount)) return false;
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      return true;
    });
  }, [transactions, categories, dateRange, searchTerm, filters]);

  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredTransactions]);

  const getDateLabel = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isToday(d))     return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEE, d MMM yyyy');
  };

  const fmtAmount = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Called when the user confirms deletion in the dialog.
  const confirmDelete = (dialog: NonNullable<DeleteDialog>) => {
    if (dialog.kind === 'single') {
      const snap = { ...dialog.transaction };
      deleteTransaction(snap.id);
      toast('Transaction deleted', {
        description: snap.description || 'Untitled',
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            addTransaction({
              amount: snap.amount, type: snap.type, category: snap.category,
              description: snap.description, date: snap.date,
              isRecurring: snap.isRecurring, recurringInterval: snap.recurringInterval,
            });
            toast.success('Transaction restored');
          },
        },
      });
    } else {
      const snaps = dialog.ids
        .map(id => transactions.find(t => t.id === id))
        .filter((t): t is Transaction => Boolean(t));
      snaps.forEach(t => deleteTransaction(t.id));
      setSelectedIds(new Set());
      const n = snaps.length;
      toast(`${n} transaction${n > 1 ? 's' : ''} deleted`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            snaps.forEach(t => addTransaction({
              amount: t.amount, type: t.type, category: t.category,
              description: t.description, date: t.date,
              isRecurring: t.isRecurring, recurringInterval: t.recurringInterval,
            }));
            toast.success(`${n} transaction${n > 1 ? 's' : ''} restored`);
          },
        },
      });
    }
  };

  const startEdit = (t: Transaction) => { setEditingId(t.id); setEditAmount(t.amount.toString()); };
  const commitEdit = (t: Transaction) => {
    const val = parseFloat(editAmount);
    if (!isNaN(val) && val > 0) updateTransaction({ ...t, amount: val });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const exportPDF = () => {
    try {
      // Rs. replaces ₹ — jsPDF's bundled Helvetica has no glyph for U+20B9 (₹)
      // and falls back to Courier for the entire text run when it encounters it.
      type RGB = [number, number, number];
      const pdfAmt = (n: number): string => {
        const abs = Math.round(Math.abs(n)).toLocaleString('en-IN');
        return n < 0 ? `-Rs.${abs}` : `Rs.${abs}`;
      };

      const doc = new jsPDF();
      const pw  = doc.internal.pageSize.width;
      const ph  = doc.internal.pageSize.height;
      const UW  = pw - 28; // 182 mm usable width (14 mm margin each side)

      // ── Header bar ────────────────────────────────────────────────────────
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 32, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Transaction Report', 14, 19);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pw - 14, 14, { align: 'right' });
      doc.text(
        `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`,
        pw - 14, 24, { align: 'right' },
      );

      // ── Transaction table ─────────────────────────────────────────────────
      // Column widths must sum to UW (182 mm): 28+65+34+38+17 = 182
      const rows = filteredTransactions.map(t => {
        const cat = categories.find(c => c.id === t.category);
        return [
          format(new Date(`${t.date}T00:00:00`), 'dd MMM yyyy'),
          t.description || 'Untitled',
          cat?.name ?? 'Uncategorized',
          `${t.type === 'income' ? '+' : '-'}Rs.${Math.round(t.amount).toLocaleString('en-IN')}`,
          t.type === 'income' ? 'Income' : 'Expense',
        ];
      });

      autoTable(doc, {
        head: [['Date', 'Description', 'Category', 'Amount', 'Type']],
        body: rows,
        startY: 40,
        tableWidth: UW,
        styles:             { font: 'helvetica', fontSize: 9, cellPadding: 3 },
        headStyles:         { fillColor: [79, 70, 229] as RGB, textColor: [255, 255, 255] as RGB, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] as RGB },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 65 },
          2: { cellWidth: 34 },
          3: { cellWidth: 38, halign: 'right' },
          4: { cellWidth: 17, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 3) return;
          const t = filteredTransactions[data.row.index];
          if (t) {
            data.cell.styles.textColor = (t.type === 'income'
              ? [16, 185, 129]
              : [244, 63, 94]) as RGB;
          }
        },
      });

      // ── Summary band ──────────────────────────────────────────────────────
      const totalIncome   = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const net           = totalIncome - totalExpenses;

      const bandY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      doc.setFillColor(248, 250, 252);
      doc.rect(14, bandY, UW, 28, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, bandY, UW, 28, 'S');

      const summaryItems: { label: string; value: string; rgb: RGB }[] = [
        { label: 'TOTAL INCOME',   value: pdfAmt(totalIncome),   rgb: [16, 185, 129] as RGB },
        { label: 'TOTAL EXPENSES', value: pdfAmt(totalExpenses), rgb: [244, 63, 94]  as RGB },
        { label: 'NET BALANCE',    value: pdfAmt(net),           rgb: (net >= 0 ? [79, 70, 229] : [244, 63, 94]) as RGB },
      ];
      const summaryColW = UW / summaryItems.length;
      summaryItems.forEach((s, i) => {
        const x = 14 + i * summaryColW + 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(s.label, x, bandY + 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(s.rgb[0], s.rgb[1], s.rgb[2]);
        doc.text(s.value, x, bandY + 22);
      });

      // ── Footer on every page ──────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Expenso  ·  Page ${p} of ${pageCount}`, pw / 2, ph - 8, { align: 'center' });
      }

      doc.save(`transactions-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exported', {
        description: `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} exported`,
      });
    } catch {
      toast.error('Failed to export PDF', { description: 'Please try again' });
    }
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k === 'type' ? v !== 'all' : v !== ''
  ).length;

  const inputCls = `mt-1 w-full px-3 py-2 text-sm rounded-xl border transition-colors
                    bg-white dark:bg-slate-700
                    border-slate-200 dark:border-slate-600
                    text-slate-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-indigo-400`;

  return (
    <>
    {/* Outer wrapper provides the relative context for the filter dropdown.
        The dropdown must NOT live inside the overflow-hidden card — CSS clips
        absolutely-positioned children regardless of z-index when any ancestor
        has overflow:hidden. */}
    <div className="relative">
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        {/* Left: title + count */}
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Transactions</h2>
          {!isLoading && filteredTransactions.length > 0 && (
            <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full tabular-nums">
              {filteredTransactions.length}
            </span>
          )}
        </div>

        {/* Right: export + filter */}
        <div className="flex items-center gap-2">
          {/* Export PDF */}
          {!isLoading && filteredTransactions.length > 0 && (
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-colors
                         border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400
                         hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export
            </button>
          )}

          {/* Filter button — dropdown is rendered outside the overflow-hidden card (see below) */}
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-colors ${
              activeFilterCount > 0
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Bulk action banner ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-2.5 border-b
                            bg-indigo-50 dark:bg-indigo-900/20
                            border-indigo-100 dark:border-indigo-800">
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => setDeleteDialog({ kind: 'bulk', ids: [...selectedIds] })}
                className="flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400
                           px-3 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState onAdd={() => navigate('/add-transaction')} />
      ) : (
        <div onMouseLeave={() => setHoveredId(null)}>
          {grouped.map(([dateStr, txns]) => (
            <div key={dateStr}>
              {/* Date group header */}
              <div className="flex items-center gap-3 px-5 py-2 sticky top-0 z-10
                              bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap
                                 text-slate-400 dark:text-slate-500">
                  {getDateLabel(dateStr)}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs tabular-nums whitespace-nowrap text-slate-300 dark:text-slate-600">
                  {txns.length} {txns.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {txns.map(t => {
                  const cat        = categories.find(c => c.id === t.category);
                  const isSelected = selectedIds.has(t.id);
                  const isHovered  = hoveredId === t.id;
                  const isEditing  = editingId === t.id;
                  const showCb     = isSelected || isHovered || selectedIds.size > 0;
                  const rowBg      = isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-900/20'
                    : isHovered
                      ? 'bg-slate-50 dark:bg-slate-800/60'
                      : 'bg-white dark:bg-slate-900';

                  return (
                    /* Swipe-to-delete wrapper */
                    <div key={t.id} className="relative overflow-x-hidden">
                      {/* Red delete indicator revealed by swipe */}
                      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-5 pointer-events-none">
                        <div className="flex flex-col items-center gap-0.5">
                          <Trash2 className="h-4 w-4 text-white" />
                          <span className="text-[10px] text-white/90 font-semibold">Delete</span>
                        </div>
                      </div>

                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      drag="x"
                      dragConstraints={{ left: -80, right: 0 }}
                      dragElastic={0.08}
                      dragMomentum={false}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -60)
                          setDeleteDialog({ kind: 'single', transaction: t });
                      }}
                      onMouseEnter={() => setHoveredId(t.id)}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors duration-100 group cursor-grab active:cursor-grabbing ${rowBg}`}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0 w-[18px]">
                        <button
                          onClick={() => toggleSelect(t.id)}
                          className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-150 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600'
                              : `border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-400 ${showCb ? 'opacity-100' : 'opacity-0'}`
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </button>
                      </div>

                      {/* Color dot */}
                      <div
                        className="flex-shrink-0 w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                        style={{ backgroundColor: cat?.color ?? '#94a3b8' }}
                      />

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/transaction/${t.id}`)}
                          className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate leading-snug
                                     hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left w-full"
                        >
                          {t.description || 'Untitled'}
                        </button>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {cat?.name ?? 'Uncategorized'}
                          {t.isRecurring && <span className="ml-1.5 text-indigo-400 dark:text-indigo-500">↺ recurring</span>}
                        </p>
                      </div>

                      {/* Amount — click to inline-edit */}
                      <div className="flex-shrink-0">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            value={editAmount}
                            onChange={e => setEditAmount(e.target.value)}
                            onBlur={() => commitEdit(t)}
                            onKeyDown={e => {
                              if (e.key === 'Enter')  commitEdit(t);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-24 text-right text-sm font-semibold px-2 py-0.5 rounded-lg tabular-nums
                                       border border-indigo-300 dark:border-indigo-600
                                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                                       text-indigo-800 dark:text-indigo-300
                                       bg-indigo-50 dark:bg-indigo-900/30"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(t)}
                            title="Click to edit"
                            className={`text-sm font-semibold tabular-nums hover:opacity-80 transition-opacity ${
                              t.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t.type === 'income' ? '+' : '−'}{fmtAmount(t.amount)}
                          </button>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteDialog({ kind: 'single', transaction: t })}
                        className={`flex-shrink-0 p-1.5 rounded-lg
                                    text-slate-300 dark:text-slate-600
                                    hover:text-rose-500 dark:hover:text-rose-400
                                    hover:bg-rose-50 dark:hover:bg-rose-900/20
                                    transition-all duration-150
                                    ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Filter panel — rendered here, outside overflow-hidden, so it overlaps freely */}
    <AnimatePresence>
      {filterOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-[66px] z-30 rounded-2xl shadow-xl border w-64 p-4 space-y-3
                     bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filters</span>
            <button onClick={() => setFilterOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          {[
            { label: 'Type',            field: 'type'     as const },
            { label: 'Category',        field: 'category' as const },
            { label: 'Date',            field: 'date'     as const },
            { label: 'Amount contains', field: 'amount'   as const },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
              {field === 'type' ? (
                <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value as FilterState['type'] })} className={inputCls}>
                  <option value="all">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              ) : field === 'category' ? (
                <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className={inputCls}>
                  <option value="">All</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input
                  type={field === 'date' ? 'date' : 'number'}
                  value={filters[field]}
                  onChange={e => setFilters({ ...filters, [field]: e.target.value })}
                  className={inputCls}
                  placeholder={field === 'amount' ? 'e.g. 1000' : undefined}
                />
              )}
            </div>
          ))}

          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ date: '', category: '', description: '', amount: '', type: 'all' })}
              className="w-full text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </div>{/* closes .relative wrapper */}

    {/* ── Confirmation dialog ─────────────────────────────────────────────── */}
    <AnimatePresence>
      {deleteDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteDialog(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 10 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.93, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 max-w-sm w-full"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-white text-center mb-1">
              {deleteDialog.kind === 'bulk'
                ? `Delete ${deleteDialog.ids.length} transaction${deleteDialog.ids.length > 1 ? 's' : ''}?`
                : 'Delete transaction?'
              }
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              {deleteDialog.kind === 'bulk'
                ? `${deleteDialog.ids.length} selected transaction${deleteDialog.ids.length > 1 ? 's' : ''} will be removed. You can undo right after.`
                : `"${deleteDialog.transaction.description || 'Untitled'}" will be removed. You can undo right after.`
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteDialog(null)}
                className="flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors
                           border-slate-100 dark:border-slate-800
                           text-slate-500 dark:text-slate-400
                           hover:border-slate-200 dark:hover:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmDelete(deleteDialog); setDeleteDialog(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors
                           bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-200/50 dark:shadow-rose-900/30"
              >
                {deleteDialog.kind === 'bulk'
                  ? `Delete ${deleteDialog.ids.length}`
                  : 'Delete'
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default TransactionList;
