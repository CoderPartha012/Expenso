"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { formatINR } from '@/lib/analytics';

interface Point { month: string; label: string; income: number; expenses: number; savings: number }
const series = [{ key: 'income', label: 'Income', color: '#2563eb' }, { key: 'expenses', label: 'Expenses', color: '#f97316' }, { key: 'savings', label: 'Net savings', color: '#64748b' }] as const;

export default function LineChart4({ data, hasData }: { data: Point[]; hasData: boolean }) {
  const reducedMotion = useReducedMotion();
  const download = () => {
    const csv = '\uFEFFMonth,Income (INR),Expenses (INR),Net savings (INR)\r\n' + data.map(row => [row.month, row.income, row.expenses, row.savings].join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `financial-trends-${data[data.length - 1].month}.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Card className="min-w-0 h-full"><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="text-lg font-semibold">Income & Expense Trends</CardTitle><p className="mt-1 text-sm text-muted-foreground">Six months ending {data[data.length - 1].label}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Export line chart data as CSV" onClick={download} disabled={!hasData}><Download className="h-4 w-4" /></Button></CardHeader>
    <CardContent className="px-3 sm:px-6 pb-6">
      {hasData ? <div className="h-[280px] sm:h-[320px] w-full" role="img" aria-label="Line chart of monthly income, expenses, and net savings in Indian rupees"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 0 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickMargin={10} minTickGap={8} />
        <YAxis width={68} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-lg border bg-popover p-3 shadow-sm min-w-[170px]"><p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p><div className="space-y-2">{payload.map(entry => <div key={String(entry.dataKey)} className="flex justify-between gap-4 text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-3 rounded-full border-[3px]" style={{ borderColor: entry.color }} />{entry.name}</span><span className="font-semibold tabular-nums text-popover-foreground">{formatINR(Number(entry.value))}</span></div>)}</div></div> : null} cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--border))' }} />
        {series.map(item => <Line key={item.key} dataKey={item.key} name={item.label} type="monotone" stroke={item.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reducedMotion} />)}
      </LineChart></ResponsiveContainer></div> : <div className="flex h-[280px] sm:h-[320px] items-center justify-center text-sm text-muted-foreground text-center px-4">No transactions in this six-month period.</div>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">{series.map(item => <span key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground"><span className="size-3.5 rounded-full border-4 bg-background" style={{ borderColor: item.color }} />{item.label}</span>)}</div>
      <table className="sr-only"><caption>Monthly amounts in INR</caption><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net savings</th></tr></thead><tbody>{data.map(row => <tr key={row.month}><th>{row.label}</th><td>{formatINR(row.income)}</td><td>{formatINR(row.expenses)}</td><td>{formatINR(row.savings)}</td></tr>)}</tbody></table>
    </CardContent></Card>;
}
