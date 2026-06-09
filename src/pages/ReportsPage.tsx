import React, { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth,
  subMonths, startOfYear, endOfYear,
} from 'date-fns';
import { useExpenseStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Eye, EyeOff,
  TrendingUp, TrendingDown, IndianRupee, Percent,
  AlertTriangle, CheckCircle2, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types & helpers ─────────────────────────────────────────────────────────

type Preset = 'this-month' | 'last-month' | 'last-3m' | 'last-6m' | 'this-year' | 'custom';

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const todayStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const monthStartStr = (() => {
  const d = startOfMonth(new Date());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

interface Range { start: Date; end: Date; label: string; }

const getRange = (preset: Preset, cs: string, ce: string): Range => {
  const now = new Date();
  switch (preset) {
    case 'this-month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy') };
    case 'last-month': {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm), label: format(lm, 'MMMM yyyy') };
    }
    case 'last-3m':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now), label: 'Last 3 Months' };
    case 'last-6m':
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now), label: 'Last 6 Months' };
    case 'this-year':
      return { start: startOfYear(now), end: endOfYear(now), label: `Year ${now.getFullYear()}` };
    case 'custom': {
      const s = cs ? new Date(`${cs}T00:00:00`) : startOfMonth(now);
      const e = ce ? new Date(`${ce}T23:59:59`) : endOfMonth(now);
      return { start: s, end: e, label: `${format(s, 'dd MMM yyyy')} – ${format(e, 'dd MMM yyyy')}` };
    }
  }
};

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3m',    label: '3 Months'   },
  { value: 'last-6m',    label: '6 Months'   },
  { value: 'this-year',  label: 'This Year'  },
  { value: 'custom',     label: 'Custom'     },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ReportsPage = () => {
  const { transactions, categories, budgets } = useExpenseStore();

  const [preset,      setPreset]      = useState<Preset>('this-month');
  const [customStart, setCustomStart] = useState(monthStartStr);
  const [customEnd,   setCustomEnd]   = useState(todayStr);
  const [showPreview, setShowPreview] = useState(true);

  const range = useMemo(
    () => getRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const filtered = useMemo(
    () => transactions.filter(t => {
      const d = new Date(`${t.date}T00:00:00`);
      return d >= range.start && d <= range.end;
    }),
    [transactions, range],
  );

  const income   = useMemo(() => filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),  [filtered]);
  const expenses = useMemo(() => filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filtered]);
  const net      = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // Top 5 spending categories
  const topCats = useMemo(() =>
    categories
      .map(cat => ({
        ...cat,
        spent: filtered.filter(t => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0),
      }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5),
    [categories, filtered],
  );

  const maxSpent = topCats[0]?.spent ?? 1;

  // Budget vs actual rows
  const budgetRows = useMemo(() =>
    categories
      .map(cat => {
        const bgt  = budgets.find(b => b.categoryId === cat.id);
        const spent = filtered.filter(t => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0);
        return {
          cat, spent,
          limit:      bgt?.limit ?? 0,
          hasLimit:   !!bgt,
          remaining:  (bgt?.limit ?? 0) - spent,
          overBudget: !!bgt && spent > bgt.limit,
          nearLimit:  !!bgt && spent > 0 && spent / bgt.limit >= 0.8 && spent <= bgt.limit,
        };
      })
      .filter(r => r.hasLimit || r.spent > 0)
      .sort((a, b) => {
        if (a.hasLimit !== b.hasLimit) return a.hasLimit ? -1 : 1;
        return b.spent - a.spent;
      }),
    [categories, budgets, filtered],
  );

  // CSV export data
  const csvRows = useMemo(() =>
    filtered.map(t => ({
      Date:        format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy'),
      Description: t.description || 'Untitled',
      Category:    categories.find(c => c.id === t.category)?.name ?? 'Uncategorized',
      Type:        t.type === 'income' ? 'Income' : 'Expense',
      Amount:      t.type === 'income' ? t.amount : -t.amount,
    })),
    [filtered, categories],
  );

  // ── PDF export ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    try {
      const doc  = new jsPDF();
      const pw   = doc.internal.pageSize.width;
      const ph   = doc.internal.pageSize.height;

      // Header bar
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text('Expense Report', 14, 22);
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Period: ${range.label}`, pw - 14, 15, { align: 'right' });
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pw - 14, 24, { align: 'right' });

      // Summary band
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 38, pw, 30, 'F');
      const summaryItems = [
        { label: 'INCOME',       value: fmtINR(income),                 r: 16,  g: 185, b: 129 },
        { label: 'EXPENSES',     value: fmtINR(expenses),               r: 244, g: 63,  b: 94  },
        { label: 'NET BALANCE',  value: fmtINR(net),                    r: net >= 0 ? 79 : 244, g: net >= 0 ? 70 : 63, b: net >= 0 ? 229 : 94 },
        { label: 'SAVINGS RATE', value: `${savingsRate.toFixed(1)}%`,   r: 139, g: 92,  b: 246 },
      ];
      summaryItems.forEach((s, i) => {
        const x = 14 + i * ((pw - 14) / 4);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text(s.label, x, 48);
        doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(s.r, s.g, s.b);
        doc.text(s.value, x, 59);
      });

      let y = 78;

      // Top spending categories
      if (topCats.length > 0) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Top Spending Categories', 14, y); y += 5;
        autoTable(doc, {
          head: [['Category', 'Amount', '% of Expenses']],
          body: topCats.map(c => [
            c.name,
            fmtINR(c.spent),
            `${expenses > 0 ? ((c.spent / expenses) * 100).toFixed(1) : 0}%`,
          ]),
          startY: y,
          styles:            { fontSize: 9, cellPadding: 3 },
          headStyles:        { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles:      { 1: { halign: 'right' }, 2: { halign: 'right' } },
          margin:            { left: 14, right: 14 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Budget vs Actual table
      if (budgetRows.length > 0) {
        if (y > 210) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Budget vs Actual', 14, y); y += 5;
        autoTable(doc, {
          head: [['Category', 'Budget', 'Spent', 'Remaining']],
          body: budgetRows.map(r => [
            r.cat.name,
            r.hasLimit ? fmtINR(r.limit) : '—',
            fmtINR(r.spent),
            r.hasLimit ? (r.overBudget ? `-${fmtINR(Math.abs(r.remaining))}` : fmtINR(r.remaining)) : '—',
          ]),
          startY: y,
          styles:            { fontSize: 9, cellPadding: 3 },
          headStyles:        { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles:      { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
          margin:            { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section === 'body' && budgetRows[data.row.index]?.overBudget) {
              data.cell.styles.textColor = [220, 38, 38] as [number, number, number];
            }
          },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Transactions table
      if (filtered.length > 0) {
        if (y > 210) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(`Transactions (${filtered.length})`, 14, y); y += 5;
        autoTable(doc, {
          head: [['Date', 'Description', 'Category', 'Amount', 'Type']],
          body: filtered.map(t => [
            format(new Date(`${t.date}T00:00:00`), 'dd MMM yyyy'),
            t.description || 'Untitled',
            categories.find(c => c.id === t.category)?.name ?? 'Uncategorized',
            t.type === 'income' ? `+${fmtINR(t.amount)}` : `-${fmtINR(t.amount)}`,
            t.type === 'income' ? 'Income' : 'Expense',
          ]),
          startY: y,
          styles:            { fontSize: 8, cellPadding: 2.5 },
          headStyles:        { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles:      { 3: { halign: 'right' } },
          margin:            { left: 14, right: 14 },
        });
      }

      // Page footer on every page
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
        doc.text(`Expenso · Page ${p} of ${pageCount}`, pw / 2, ph - 8, { align: 'center' });
      }

      doc.save(`expenso-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Report downloaded', {
        description: `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} · ${range.label}`,
      });
    } catch {
      toast.error('Failed to export PDF', { description: 'Please try again' });
    }
  };

  // ── Shared cell styles ────────────────────────────────────────────────────
  const thCls = 'text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2.5 text-right';
  const thClsL = 'text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-2.5 text-left';
  const tdCls = 'px-4 py-3 text-sm text-right tabular-nums';
  const tdClsL = 'px-4 py-3 text-sm text-left';

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
          Analyse your finances, preview the PDF, then export
        </p>
      </div>

      {/* ── Date range selector ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Date Range</span>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">{range.label}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                preset === p.value
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {preset === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-base sm:text-sm
                               bg-slate-50 dark:bg-slate-800
                               border-slate-200 dark:border-slate-700
                               text-slate-900 dark:text-slate-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-base sm:text-sm
                               bg-slate-50 dark:bg-slate-800
                               border-slate-200 dark:border-slate-700
                               text-slate-900 dark:text-slate-100
                               focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          {
            label: 'Income',
            value: fmtINR(income),
            sub:   `${filtered.filter(t => t.type === 'income').length} transactions`,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg:    'bg-emerald-50 dark:bg-emerald-900/20',
            Icon:  TrendingUp,
          },
          {
            label: 'Expenses',
            value: fmtINR(expenses),
            sub:   `${filtered.filter(t => t.type === 'expense').length} transactions`,
            color: 'text-rose-600 dark:text-rose-400',
            bg:    'bg-rose-50 dark:bg-rose-900/20',
            Icon:  TrendingDown,
          },
          {
            label: 'Net Balance',
            value: fmtINR(net),
            sub:   net >= 0 ? 'Surplus' : 'Deficit',
            color: net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400',
            bg:    'bg-indigo-50 dark:bg-indigo-900/20',
            Icon:  IndianRupee,
          },
          {
            label: 'Savings Rate',
            value: `${savingsRate.toFixed(1)}%`,
            sub:   income > 0 ? 'of income saved' : 'No income recorded',
            color: 'text-violet-600 dark:text-violet-400',
            bg:    'bg-violet-50 dark:bg-violet-900/20',
            Icon:  Percent,
          },
        ] as const).map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4"
          >
            <div className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Top 5 categories + Budget table ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 5 spending categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top Spending Categories</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Top 5 expense categories in this period</p>
          </div>
          <div className="p-5 space-y-5">
            {topCats.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No expenses in this period</p>
            ) : topCats.map((cat, i) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-300 dark:text-slate-600 tabular-nums w-3 flex-shrink-0">{i + 1}</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                      {expenses > 0 ? ((cat.spent / expenses) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {fmtINR(cat.spent)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.spent / maxSpent) * 100}%` }}
                    transition={{ duration: 0.55, delay: i * 0.07, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget vs Actual table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Budget vs Actual</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Spending against your set budget limits</p>
          </div>
          {budgetRows.length === 0 ? (
            <div className="p-5 text-center py-12">
              <p className="text-sm text-slate-400 dark:text-slate-500">No budgets or spending this period</p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Set category budgets from the Dashboard</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className={thClsL}>Category</th>
                    <th className={thCls}>Budget</th>
                    <th className={thCls}>Spent</th>
                    <th className={thCls}>Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {budgetRows.map(row => (
                    <tr key={row.cat.id} className={row.overBudget ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}>
                      <td className={tdClsL}>
                        <div className="flex items-center gap-2">
                          {row.overBudget ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                          ) : row.nearLimit ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                          ) : row.hasLimit ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.cat.color }} />
                          )}
                          <span className={`font-medium truncate ${
                            row.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {row.cat.name}
                          </span>
                        </div>
                      </td>
                      <td className={`${tdCls} text-slate-400 dark:text-slate-500`}>
                        {row.hasLimit ? fmtINR(row.limit) : <span className="text-slate-300 dark:text-slate-700">—</span>}
                      </td>
                      <td className={`${tdCls} font-semibold ${row.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {fmtINR(row.spent)}
                      </td>
                      <td className={tdCls}>
                        {row.hasLimit ? (
                          <span className={`font-semibold ${row.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {row.overBudget ? `−${fmtINR(Math.abs(row.remaining))}` : fmtINR(row.remaining)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── PDF Preview ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4
                     hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {showPreview
              ? <EyeOff className="h-4 w-4 text-indigo-500" />
              : <Eye className="h-4 w-4 text-indigo-500" />
            }
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">PDF Preview</span>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">
              — see exactly what will be downloaded
            </span>
          </div>
          <span className="text-xs font-medium text-indigo-500">
            {showPreview ? 'Hide' : 'Show'}
          </span>
        </button>

        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">
                {/* Paper document */}
                <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg max-w-2xl mx-auto bg-white dark:bg-slate-950">

                  {/* PDF header bar */}
                  <div className="bg-slate-900 dark:bg-black px-6 py-5 flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Expense Report</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Generated {format(new Date(), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Period</p>
                      <p className="text-sm font-bold text-white mt-0.5">{range.label}</p>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200 dark:border-slate-700">
                    {[
                      { label: 'Income',    value: fmtINR(income),           cls: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Expenses',  value: fmtINR(expenses),         cls: 'text-rose-600 dark:text-rose-400' },
                      { label: 'Net',       value: fmtINR(net),              cls: net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400' },
                      { label: 'Savings',   value: `${savingsRate.toFixed(1)}%`, cls: 'text-violet-600 dark:text-violet-400' },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-sm font-bold tabular-nums mt-0.5 ${s.cls}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Body sections */}
                  <div className="px-6 py-5 space-y-6 bg-white dark:bg-slate-950">

                    {/* Top categories mini-table */}
                    {topCats.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Top Spending Categories
                        </p>
                        <div className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                          <table className="w-full text-xs">
                            <thead className="bg-indigo-600">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-white">Category</th>
                                <th className="text-right px-3 py-2 font-semibold text-white">Amount</th>
                                <th className="text-right px-3 py-2 font-semibold text-white">Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {topCats.map((cat, i) => (
                                <tr key={cat.id} className={i % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-950'}>
                                  <td className="px-3 py-2 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                    {cat.name}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                                    {fmtINR(cat.spent)}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                                    {expenses > 0 ? ((cat.spent / expenses) * 100).toFixed(1) : 0}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Budget vs actual mini-table */}
                    {budgetRows.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Budget vs Actual
                        </p>
                        <div className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-800 dark:bg-black">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-white">Category</th>
                                <th className="text-right px-3 py-2 font-semibold text-white">Budget</th>
                                <th className="text-right px-3 py-2 font-semibold text-white">Spent</th>
                                <th className="text-right px-3 py-2 font-semibold text-white">Left</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {budgetRows.map((row, i) => (
                                <tr key={row.cat.id} className={
                                  row.overBudget
                                    ? 'bg-rose-50 dark:bg-rose-900/20'
                                    : i % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-950'
                                }>
                                  <td className={`px-3 py-2 font-medium ${row.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {row.cat.name}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                                    {row.hasLimit ? fmtINR(row.limit) : '—'}
                                  </td>
                                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${row.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {fmtINR(row.spent)}
                                  </td>
                                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${row.overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {row.hasLimit
                                      ? row.overBudget
                                        ? `−${fmtINR(Math.abs(row.remaining))}`
                                        : fmtINR(row.remaining)
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Transaction list preview (first 5) */}
                    {filtered.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Transactions ({filtered.length})
                        </p>
                        <div className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                          <table className="w-full text-xs">
                            <thead className="bg-indigo-600">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-white">Date</th>
                                <th className="text-left px-3 py-2 font-semibold text-white">Description</th>
                                <th className="text-left px-3 py-2 font-semibold text-white hidden sm:table-cell">Category</th>
                                <th className="text-right px-3 py-2 font-semibold text-white">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {filtered.slice(0, 5).map((t, i) => {
                                const cat = categories.find(c => c.id === t.category);
                                return (
                                  <tr key={t.id} className={i % 2 === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-950'}>
                                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                                      {format(new Date(`${t.date}T00:00:00`), 'dd MMM')}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[90px] truncate">
                                      {t.description || 'Untitled'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-400 hidden sm:table-cell">
                                      {cat?.name ?? '—'}
                                    </td>
                                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${
                                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                      {t.type === 'income' ? '+' : '−'}{fmtINR(t.amount)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {filtered.length > 5 && (
                            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                +{filtered.length - 5} more row{filtered.length - 5 !== 1 ? 's' : ''} in the downloaded PDF
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {filtered.length === 0 && (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                        No transactions in this period
                      </p>
                    )}

                    {/* Footer rule */}
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                      <p className="text-[10px] text-slate-300 dark:text-slate-700">Expenso · Page 1 of N</p>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Export actions ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pb-4">
        <button
          type="button"
          onClick={exportPDF}
          disabled={filtered.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     disabled:opacity-40 disabled:cursor-not-allowed
                     text-white font-semibold text-sm shadow-sm shadow-indigo-300/40
                     transition-all duration-150 active:scale-[0.98]"
        >
          <FileText className="h-4 w-4" />
          Download PDF Report
        </button>
        <CSVLink
          data={csvRows}
          filename={`expenso-${format(new Date(), 'yyyy-MM-dd')}.csv`}
          onClick={() => {
            if (filtered.length === 0) return false;
            toast.success('CSV exported', { description: `${filtered.length} rows · ${range.label}` });
            return true;
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl
                      border-2 border-slate-200 dark:border-slate-700
                      text-slate-700 dark:text-slate-300 font-semibold text-sm
                      hover:border-slate-300 dark:hover:border-slate-600
                      hover:bg-slate-50 dark:hover:bg-slate-800
                      transition-all duration-150 active:scale-[0.98]
                      ${filtered.length === 0 ? 'pointer-events-none opacity-40' : ''}`}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </CSVLink>
      </div>
    </div>
  );
};

export default ReportsPage;
