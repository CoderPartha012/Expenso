"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, IndianRupee, MoreVertical, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExpenseStore } from '@/store';
import { paginateTransactions, sortTransactions, togglePageSelection, transactionsCSV, type TableSort } from '@/lib/transaction-table';
import { Checkbox } from './checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
const dateLabel = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const badge = (type: 'income' | 'expense') => 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ' + (type === 'income' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400');

export function TransactionsTable({ className = '', enableAnimations = true }: { className?: string; enableAnimations?: boolean }) {
  const { transactions, categories } = useExpenseStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<TableSort>('date-desc');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const animate = enableAnimations && !reduceMotion;
  const filtered = sortTransactions(transactions, type, sort);
  const { page, pages, rows } = paginateTransactions(filtered, currentPage);
  const categoryName = (id: string) => categories.find(c => c.id === id)?.name ?? 'Uncategorized';
  const detail = transactions.find(t => t.id === detailId);
  const visibleSelected = filtered.filter(t => selected.has(t.id));
  const checkedCount = rows.filter(t => selected.has(t.id)).length;

  useEffect(() => {
    if (detailId && dialog.current && !dialog.current.open) { dialog.current.showModal(); closeButton.current?.focus(); }
    else if (!detailId && dialog.current?.open) dialog.current.close();
  }, [detailId]);

  const exportFile = (kind: 'csv' | 'json') => {
    const data = visibleSelected.length ? visibleSelected : filtered;
    const content = kind === 'csv' ? transactionsCSV(data, categoryName) : JSON.stringify(data.map(t => ({ ...t, categoryName: categoryName(t.category), currency: 'INR' })), null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `transactions-${new Date().toISOString().slice(0, 10)}.${kind}`;
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className={'w-full max-w-7xl mx-auto ' + className}>
    <header className="flex flex-wrap items-end justify-between gap-4 mb-8"><div><h1 className="text-3xl font-bold tracking-tight">Transactions</h1><p className="mt-1 text-sm text-muted-foreground">Your income and expenses, all in one place.</p></div><Link to="/add-transaction" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Add transaction</Link></header>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground" aria-live="polite">{filtered.length.toLocaleString('en-IN')} transactions{visibleSelected.length > 0 && <> · {visibleSelected.length} selected <button type="button" onClick={() => setSelected(new Set())} className="ml-2 text-primary hover:underline">Clear</button></>}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={type} onValueChange={value => { setType(value as typeof type); setCurrentPage(1); }}><SelectTrigger aria-label="Filter transactions by type" className={'w-auto min-w-32 h-9 text-sm ' + (type !== 'all' ? 'ring-2 ring-primary/30' : '')}><Filter className="mr-2 h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent></Select>
        <Select value={sort} onValueChange={value => { setSort(value as TableSort); setCurrentPage(1); }}><SelectTrigger aria-label="Sort transactions" className="w-auto min-w-40 h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date-desc">Newest first</SelectItem><SelectItem value="date-asc">Oldest first</SelectItem><SelectItem value="amount-desc">Amount: high to low</SelectItem><SelectItem value="amount-asc">Amount: low to high</SelectItem><SelectItem value="description-asc">Description: A to Z</SelectItem></SelectContent></Select>
        <Select value="" onValueChange={value => exportFile(value as 'csv' | 'json')}><SelectTrigger aria-label={visibleSelected.length ? 'Export selected transactions' : 'Export filtered transactions'} disabled={filtered.length === 0} className="w-auto h-9 text-sm"><span className="flex items-center gap-2"><Download className="h-3.5 w-3.5" />Export{visibleSelected.length ? ` (${visibleSelected.length})` : ''}</span></SelectTrigger><SelectContent><SelectItem value="csv">CSV (INR)</SelectItem><SelectItem value="json">JSON</SelectItem></SelectContent></Select>
      </div>
    </div>
    <div id="tour-table" className="rounded-lg border border-border/50 bg-background overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><caption className="sr-only">Transactions with selection, type, amount in Indian rupees, category, date and details</caption>
        <thead className="border-b border-border/30 bg-muted/20 text-xs font-medium text-muted-foreground"><tr>
          <th className="w-12 p-3 text-center"><Checkbox aria-label="Select all transactions on this page" disabled={!rows.length} checked={checkedCount === rows.length && rows.length > 0 ? true : checkedCount > 0 ? 'indeterminate' : false} onCheckedChange={() => setSelected(previous => togglePageSelection(previous, rows))} /></th>
          <th className="px-3 py-3 border-l border-border/20"><span className="flex gap-2 items-center"><IndianRupee className="h-3.5 w-3.5 opacity-50" />Transaction</span></th><th className="px-3 border-l border-border/20">Type</th><th className="px-3 border-l border-border/20 text-right"><span className="flex items-center justify-end gap-1"><IndianRupee className="h-3.5 w-3.5" />Amount (INR)</span></th><th className="px-3 border-l border-border/20">Category</th><th className="px-3 border-l border-border/20"><span className="flex gap-2 items-center"><Calendar className="h-3.5 w-3.5 opacity-50" />Date</span></th><th className="w-12"><span className="sr-only">Details</span></th>
        </tr></thead>
        <motion.tbody key={`${page}-${sort}-${type}`} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: animate ? 0.035 : 0 } } }}>
          {rows.map(t => <motion.tr key={t.id} variants={{ hidden: { opacity: animate ? 0 : 1, y: animate ? 10 : 0 }, visible: { opacity: 1, y: 0 } }} className={'group border-b border-border/20 transition-colors ' + (selected.has(t.id) ? 'bg-muted/40' : 'hover:bg-muted/20')}>
            <td className="text-center p-3.5"><Checkbox aria-label={`Select ${t.description || 'transaction'} dated ${t.date}`} checked={selected.has(t.id)} onCheckedChange={() => setSelected(previous => { const next = new Set(previous); if (next.has(t.id)) next.delete(t.id); else next.add(t.id); return next; })} /></td>
            <td className="px-3 py-3.5 border-l border-border/20 max-w-64"><button type="button" onClick={() => setDetailId(t.id)} className="inline-flex items-center gap-2 rounded-full bg-muted/40 px-2.5 py-1 text-left max-w-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><IndianRupee className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{t.description || 'Transaction'}</span></button></td>
            <td className="px-3 border-l border-border/20"><span className={badge(t.type)}><span className="size-1.5 rounded-full bg-current" />{t.type === 'income' ? 'Income' : 'Expense'}</span></td>
            <td className="px-3 border-l border-border/20 text-right tabular-nums whitespace-nowrap">{money(t.amount)}</td><td className="px-3 border-l border-border/20"><span className="text-blue-500 dark:text-blue-400">{categoryName(t.category)}</span></td><td className="px-3 border-l border-border/20 text-muted-foreground whitespace-nowrap">{dateLabel(t.date)}</td><td className="px-3"><button type="button" aria-label={`View details for ${t.description || 'transaction'}`} onClick={() => setDetailId(t.id)} className="p-1 rounded text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><MoreVertical className="h-4 w-4" /></button></td>
          </motion.tr>)}
          {!rows.length && <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">{transactions.length ? 'No transactions match this filter.' : 'No transactions yet. Add your first income or expense.'}</td></tr>}
        </motion.tbody>
      </table></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground"><span>{filtered.length ? `${(page - 1) * 10 + 1}-${Math.min(page * 10, filtered.length)} of ${filtered.length}` : '0 transactions'}</span><nav aria-label="Transaction pagination" className="flex items-center gap-2"><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setCurrentPage(page - 1)} className="rounded border p-1.5 hover:bg-muted disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button><span>Page {page} of {pages}</span><button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setCurrentPage(page + 1)} className="rounded border p-1.5 hover:bg-muted disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button></nav></footer>
    </div>
    <dialog ref={dialog} aria-labelledby="transaction-modal-title" onCancel={() => setDetailId(null)} onClose={() => setDetailId(null)} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setDetailId(null); } }} className="w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-background/60 backdrop:backdrop-blur-sm">
      {detail && <motion.div key={detail.id} initial={animate ? { opacity: 0, scale: 0.95, y: 12 } : false} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative p-6">
        <button ref={closeButton} type="button" aria-label="Close transaction details" onClick={() => setDetailId(null)} className="absolute right-3 top-3 grid size-7 place-content-center rounded-full bg-muted/50 hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
        <div className="flex items-center gap-3 mb-6 pr-6"><div className="grid size-12 shrink-0 place-content-center rounded-full bg-primary/10"><IndianRupee className="h-6 w-6 text-primary" /></div><div className="min-w-0"><h2 id="transaction-modal-title" className="text-lg font-semibold break-words">{detail.description || 'Transaction details'}</h2><span className={badge(detail.type)}>{detail.type === 'income' ? 'Income' : 'Expense'}</span></div></div>
        <dl className="space-y-4">{[['Amount (INR)', money(detail.amount)], ['Category', categoryName(detail.category)], ['Date', dateLabel(detail.date)], ['Description', detail.description || 'No description'], ['Recurring', detail.isRecurring ? detail.recurringInterval ?? 'Yes' : 'Does not repeat'], ...(detail.nextRecurringDate ? [['Next occurrence', dateLabel(detail.nextRecurringDate)]] : [])].map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</dt><dd className="text-sm break-words">{value}</dd></div>)}</dl>
        <Link to={`/transaction/${detail.id}`} onClick={() => setDetailId(null)} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open full transaction<ChevronRight className="h-4 w-4" /></Link>
      </motion.div>}
    </dialog>
  </div>;
}

export { TransactionsTable as ContactsTable };
