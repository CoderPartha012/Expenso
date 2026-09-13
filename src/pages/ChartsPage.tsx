import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { useExpenseStore } from '@/store';
import { buildAnalytics, formatINR } from '@/lib/analytics';
import LineChart4 from '@/components/ui/line-charts-4';
import { DonutChart } from '@/components/ui/donut-chart';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ChartsPage() {
  const { transactions, categories } = useExpenseStore();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeId, setActiveId] = useState<string | null>(null);
  const months = [...new Set([...Array.from({ length: 12 }, (_, index) => format(subMonths(new Date(), index), 'yyyy-MM')), ...transactions.map(t => t.date.slice(0, 7))])].sort().reverse();
  const { line, donut, total, hasLineData } = buildAnalytics(transactions, categories, month);
  const active = donut.find(segment => segment.id === activeId);
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Understand your finances with income trends and spending insights.</p></div><Select value={month} onValueChange={value => { setMonth(value); setActiveId(null); }}><SelectTrigger aria-label="Analytics month" className="w-44 bg-card"><SelectValue /></SelectTrigger><SelectContent>{months.map(value => <SelectItem key={value} value={value}>{format(new Date(value + '-01T00:00:00'), 'MMMM yyyy')}</SelectItem>)}</SelectContent></Select></header>
    <div id="tour-analytics" className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start"><div className="xl:col-span-2 min-w-0"><LineChart4 data={line} hasData={hasLineData} /></div>
      <Card className="p-6 md:p-8 flex flex-col items-center space-y-6 rounded-xl"><div className="text-center"><h2 className="text-xl font-semibold tracking-tight">Spending Breakdown</h2><p className="mt-1 text-sm text-muted-foreground">{format(new Date(month + '-01T00:00:00'), 'MMMM yyyy')}</p></div>
        <DonutChart key={month} data={donut} onSegmentHover={segment => setActiveId(segment?.id ?? null)} centerContent={<><p className="text-muted-foreground text-sm font-medium max-w-[150px] truncate">{active?.label ?? 'Total expenses'}</p><p className="text-2xl font-bold tabular-nums break-all max-w-[175px]">{formatINR(active?.value ?? total)}</p>{active && total > 0 && <p className="mt-1 text-sm font-medium text-muted-foreground">{(active.value / total * 100).toFixed(1)}%</p>}</>} />
        <div className="w-full pt-4 border-t space-y-2">{donut.length ? donut.map(segment => <button key={segment.id} type="button" onMouseEnter={() => setActiveId(segment.id)} onMouseLeave={() => setActiveId(null)} onFocus={() => setActiveId(segment.id)} onBlur={() => setActiveId(null)} onClick={() => setActiveId(activeId === segment.id ? null : segment.id)} className={'flex w-full items-center justify-between gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' + (activeId === segment.id ? 'bg-muted' : '')}><span className="flex items-center gap-3 min-w-0"><span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="text-sm font-medium truncate">{segment.label}</span></span><span className="text-sm font-semibold text-muted-foreground tabular-nums whitespace-nowrap">{formatINR(segment.value)}</span></button>) : <p className="text-sm text-muted-foreground text-center">No expenses recorded this month.</p>}</div>
      </Card>
    </div>
  </div>;
}
