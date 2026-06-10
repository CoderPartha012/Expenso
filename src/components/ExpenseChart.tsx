import React, { useState, useMemo } from 'react';
import { useExpenseStore } from '../store';
import { BarChart2, PieChart as PieIcon, TrendingUp, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subMonths } from 'date-fns';
import {
  PieChart, Pie, Cell, Tooltip, Label,
  AreaChart, Area,
  BarChart, Bar, LabelList,
  XAxis, YAxis, CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

type ChartType = 'pie' | 'area' | 'bar';

const TIME_OPTIONS = [
  { label: '1M', value: 1  },
  { label: '3M', value: 3  },
  { label: '6M', value: 6  },
  { label: '1Y', value: 12 },
] as const;

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

// ─── Tooltips ─────────────────────────────────────────────────────────────────

interface PiePayloadItem { value: number; name: string; payload: { color: string }; }
interface PieTooltipProps { active?: boolean; payload?: PiePayloadItem[]; total: number; }
const PieTooltip = ({ active, payload, total }: PieTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-lg p-3 text-sm min-w-[140px]">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.payload.color }} />
        <span className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
      </div>
      <p className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{fmtINR(item.value)}</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{pct}% of total</p>
    </div>
  );
};

interface ChartPayloadItem { name: string; value: number; fill?: string; stroke?: string; }
interface ChartTooltipProps { active?: boolean; payload?: ChartPayloadItem[]; label?: string; }
const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-lg p-3 text-sm min-w-[140px]">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill || p.stroke }} />
          <span className="text-slate-500 dark:text-slate-400 text-xs">{p.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{fmtINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Donut centre label ───────────────────────────────────────────────────────
interface DonutLabelProps {
  viewBox?: { cx?: number; cy?: number };
  total:    number;
}
const DonutLabel = ({ viewBox, total }: DonutLabelProps) => {
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;
  if (!viewBox?.cx || !viewBox?.cy) return null;
  return (
    <g>
      <text x={cx} y={cy - 9}  textAnchor="middle" fill="#94a3b8" fontSize="11">Total</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="700">
        {fmtINR(total)}
      </text>
    </g>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-44 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
      <BarChart2 className="h-6 w-6 text-slate-300 dark:text-slate-600" />
    </div>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No data to display</p>
    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[160px]">Add transactions to see your analytics</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ExpenseChart = () => {
  const { transactions, categories } = useExpenseStore();
  const [chartType, setChartType]               = useState<ChartType>('pie');
  const [timeRange, setTimeRange]               = useState(6);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categories.slice(0, 5).map(c => c.id)
  );

  const toggleCategory = (id: string) =>
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );

  const months = useMemo(
    () => Array.from({ length: timeRange }, (_, i) => format(subMonths(new Date(), i), 'MMM yy')).reverse(),
    [timeRange]
  );

  const { categoryExpenses, totalExpense, monthlyData, monthlyIEData, avgMonthly } = useMemo(() => {
    const catExp = categories
      .filter(c => selectedCategories.includes(c.id))
      .map(cat => ({
        id: cat.id, name: cat.name, color: cat.color,
        value: transactions
          .filter(t => t.category === cat.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = catExp.reduce((s, c) => s + c.value, 0);

    const monthly = months.map(month => {
      const row: Record<string, string | number> = { month };
      categories.filter(c => selectedCategories.includes(c.id)).forEach(cat => {
        row[cat.name] = transactions
          .filter(t =>
            t.category === cat.id && t.type === 'expense' &&
            format(new Date(`${t.date}T00:00:00`), 'MMM yy') === month
          )
          .reduce((sum, t) => sum + t.amount, 0);
      });
      return row;
    });

    const monthlyIE = months.map(month => ({
      month,
      Income: transactions
        .filter(t => t.type === 'income' && format(new Date(`${t.date}T00:00:00`), 'MMM yy') === month)
        .reduce((sum, t) => sum + t.amount, 0),
      Expenses: transactions
        .filter(t => t.type === 'expense' && format(new Date(`${t.date}T00:00:00`), 'MMM yy') === month)
        .reduce((sum, t) => sum + t.amount, 0),
    }));

    return {
      categoryExpenses: catExp,
      totalExpense: total,
      monthlyData: monthly,
      monthlyIEData: monthlyIE,
      avgMonthly: total / timeRange,
    };
  }, [transactions, categories, selectedCategories, months, timeRange]);

  const selectedCats = categories.filter(c => selectedCategories.includes(c.id));

  const csvData = categoryExpenses.map(item => ({
    Category: item.name,
    Amount: item.value,
    Percentage: `${totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0}%`,
  }));

  const exportPDF = () => {
    try {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const cx = (t: string, y: number, s = 10) => { doc.setFontSize(s); doc.text(t, (pw - doc.getTextWidth(t)) / 2, y); };
    doc.setFillColor(75, 85, 99); doc.rect(0, 0, pw, 40, 'F');
    doc.setTextColor(255, 255, 255); cx('Expense Distribution Report', 25, 24);
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 55);
    doc.text(`Period: Last ${timeRange} month(s)`, 14, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Expenses: ${fmtINR(totalExpense)}`, 14, 80);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryExpenses.map(item => [
        item.name, fmtINR(item.value),
        `${totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0}%`,
      ]),
      startY: 90,
      headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
    });
    doc.setFontSize(8); doc.setTextColor(128, 128, 128);
    const footer = 'Generated by Expenso';
    doc.text(footer, (pw - doc.getTextWidth(footer)) / 2, ph - 10);
    doc.save('expense-report.pdf');
    toast.success('Report exported', { description: 'expense-report.pdf downloaded' });
    } catch {
      toast.error('Failed to export PDF', { description: 'Please try again' });
    }
  };

  const hasBarData = monthlyIEData.some(d => d.Income > 0 || d.Expenses > 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Analytics</h2>
          {totalExpense > 0 && (
            <div className="flex items-center gap-0.5">
              <CSVLink
                data={csvData}
                filename="expenses.csv"
                title="Export CSV"
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </CSVLink>
              <button
                onClick={exportPDF}
                title="Export PDF"
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Time range pill tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 gap-0.5">
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  timeRange === opt.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Chart type pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 gap-0.5">
            {([
              { type: 'pie'  as ChartType, Icon: PieIcon,   title: 'Pie'  },
              { type: 'area' as ChartType, Icon: TrendingUp, title: 'Area' },
              { type: 'bar'  as ChartType, Icon: BarChart2,  title: 'Bar'  },
            ]).map(({ type, Icon, title }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                title={title}
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  chartType === type
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category chips ─────────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-b border-slate-50 dark:border-slate-800/60 flex flex-wrap gap-1.5">
        {categories.map(cat => {
          const on = selectedCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150"
              style={on
                ? { backgroundColor: cat.color + '18', borderColor: cat.color, color: cat.color }
                : { borderColor: '#334155', color: '#64748b' }
              }
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: on ? cat.color : '#475569' }} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {/* PIE */}
            {chartType === 'pie' && (
              totalExpense === 0 ? <EmptyState /> : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={categoryExpenses}
                        cx="50%" cy="50%"
                        innerRadius={68} outerRadius={105}
                        dataKey="value" nameKey="name"
                        paddingAngle={2} strokeWidth={0}
                      >
                        {categoryExpenses.map(entry => (
                          <Cell key={entry.id} fill={entry.color} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
                        ))}
                        <Label
                          content={<DonutLabel total={totalExpense} />}
                          position="center"
                        />
                      </Pie>
                      <Tooltip content={<PieTooltip total={totalExpense} />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Custom legend */}
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                    {categoryExpenses.map(item => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{item.name}</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* AREA */}
            {chartType === 'area' && (
              totalExpense === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto -mx-1">
                <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={monthlyData} margin={{ top: 14, right: 4, left: -14, bottom: 32 }}>
                    <defs>
                      {selectedCats.map(cat => (
                        <linearGradient key={cat.id} id={`aGrad-${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={cat.color} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={cat.color} stopOpacity={0.01} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={40} />
                    <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine
                      y={avgMonthly}
                      stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5}
                      label={{ value: 'avg', position: 'insideTopRight', fontSize: 9, fill: '#6366f1', dy: -4 }}
                    />
                    {selectedCats.map(cat => (
                      <Area
                        key={cat.id}
                        type="monotone" dataKey={cat.name}
                        stroke={cat.color} strokeWidth={2}
                        fill={`url(#aGrad-${cat.id})`}
                        dot={{ r: 3.5, fill: cat.color, stroke: '#fff', strokeWidth: 1.5 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                </div>
                </div>
              )
            )}

            {/* BAR */}
            {chartType === 'bar' && (
              hasBarData ? (
                <div className="overflow-x-auto -mx-1">
                <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={monthlyIEData} margin={{ top: 20, right: 4, left: -14, bottom: 32 }} barCategoryGap="28%" barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={40} />
                    <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Income" fill="#10b981" radius={[5, 5, 0, 0]}>
                      <LabelList dataKey="Income" position="top"
                        formatter={(v: number) => v > 0 ? fmtCompact(v) : ''}
                        style={{ fontSize: 9, fill: '#10b981', fontWeight: '700' }} />
                    </Bar>
                    <Bar dataKey="Expenses" fill="#f43f5e" radius={[5, 5, 0, 0]}>
                      <LabelList dataKey="Expenses" position="top"
                        formatter={(v: number) => v > 0 ? fmtCompact(v) : ''}
                        style={{ fontSize: 9, fill: '#f43f5e', fontWeight: '700' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
                </div>
              ) : <EmptyState />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Summary footer ──────────────────────────────────────────────────── */}
      {totalExpense > 0 && (
        <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 dark:text-slate-500">Total expenses</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{fmtINR(totalExpense)}</span>
          </div>
          {categoryExpenses[0] && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Top: {categoryExpenses[0].name}</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{fmtINR(categoryExpenses[0].value)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseChart;
