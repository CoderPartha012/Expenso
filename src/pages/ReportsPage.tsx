import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Download, Eye, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useExpenseStore } from '@/store';
import { buildReport, reportDate, reportMoney, reportRange, type ReportPreset } from '@/lib/reports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const presets: { value: ReportPreset; label: string }[] = [{ value: 'this-month', label: 'This month' }, { value: 'last-month', label: 'Last month' }, { value: 'last-3m', label: '3 months' }, { value: 'last-6m', label: '6 months' }, { value: 'this-year', label: 'This year' }, { value: 'all', label: 'All records' }, { value: 'custom', label: 'Custom' }];
let fontPromise: Promise<string> | null = null;
const loadFont = () => fontPromise ??= fetch('/fonts/DejaVuSans.ttf').then(response => { if (!response.ok) throw new Error('Report font could not be loaded'); return response.arrayBuffer(); }).then(buffer => { let binary = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(binary); }).catch(error => { fontPromise = null; throw error; });

function ReportTable({ title, headers, rows, numeric = [] }: { title: string; headers: string[]; rows: (string | number)[][]; numeric?: number[] }) {
  return <Card className="overflow-hidden"><h2 className="px-5 py-4 font-semibold border-b">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr>{headers.map((header, index) => <th key={header} className={'px-4 py-3 font-medium whitespace-nowrap ' + (numeric.includes(index) ? 'text-right' : 'text-left')}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t even:bg-muted/20">{row.map((cell, col) => <td key={col} className={'px-4 py-3 ' + (numeric.includes(col) ? 'text-right whitespace-nowrap tabular-nums' : 'text-left break-words')}>{cell}</td>)}</tr>)}{rows.length === 0 && <tr><td colSpan={headers.length} className="p-8 text-center text-muted-foreground">No data for this section in the selected period.</td></tr>}</tbody></table></div></Card>;
}

export default function ReportsPage() {
  const { transactions, categories, budgets } = useExpenseStore();
  const [preset, setPreset] = useState<ReportPreset>('this-month');
  const [start, setStart] = useState(format(new Date(), 'yyyy-MM-01'));
  const [end, setEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; start: string; end: string } | null>(null);
  const [page, setPage] = useState(1);
  const range = useMemo(() => reportRange(preset, start, end, transactions), [preset, start, end, transactions]);
  const report = useMemo(() => range ? buildReport(transactions, categories, budgets, range) : null, [range, transactions, categories, budgets]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const pages = Math.max(1, Math.ceil((report?.rows.length ?? 0) / 10));
  const currentPage = Math.min(page, pages);
  const names = new Map(report?.categories.map(c => [c.id, c.name]) ?? []);
  const change = (value: ReportPreset) => { setPreset(value); setPreview(null); setPage(1); };
  const exportReport = async (kind: 'pdf' | 'excel' | 'preview') => {
    if (!report?.rows.length || busy) return;
    setBusy(kind);
    try {
      const { createReportPDF, createReportExcel } = await import('@/lib/report-exports');
      const filename = `expenso-report-${report.range.start}-to-${report.range.end}`;
      if (kind === 'excel') {
        const workbook = await createReportExcel(report);
        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a'); link.href = url; link.download = filename + '.xlsx'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const pdf = createReportPDF(report, await loadFont());
        if (kind === 'preview') setPreview({ url: URL.createObjectURL(pdf.output('blob')), ...report.range });
        else pdf.save(filename + '.pdf');
      }
      if (kind !== 'preview') toast.success(`${kind === 'excel' ? 'Excel workbook' : 'PDF report'} downloaded`, { description: `${report.rows.length} transactions. Currency: INR.` });
    } catch { toast.error('Could not generate the report. Please try again.'); } finally { setBusy(null); }
  };

  return <div id="tour-reports" className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Reports</h1><p className="mt-2 text-sm text-muted-foreground">Review a period, inspect the details, and download a formatted PDF or Excel workbook.</p></div><Link to="/help#guides" className="text-sm text-primary hover:underline">Report help</Link></header>
    <Card className="p-5 space-y-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Reporting period</h2>{range && <p className="text-sm text-muted-foreground">{reportDate(range.start)} to {reportDate(range.end)}</p>}</div><div className="flex flex-wrap gap-2">{presets.map(item => <Button key={item.value} variant={preset === item.value ? 'default' : 'outline'} onClick={() => change(item.value)} aria-pressed={preset === item.value}>{item.label}</Button>)}</div>
      {preset === 'custom' && <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="report-start">From</Label><Input id="report-start" type="date" value={start} onChange={event => { setStart(event.target.value); setPreview(null); setPage(1); }} /></div><div className="space-y-2"><Label htmlFor="report-end">To</Label><Input id="report-end" type="date" value={end} onChange={event => { setEnd(event.target.value); setPreview(null); setPage(1); }} /></div></div>}
      {!range && <p role="alert" className="text-sm text-destructive">Choose valid dates with From on or before To.</p>}
      <p className="text-xs text-muted-foreground">Includes both start and end dates. Figures reflect saved transactions, including any future-dated entries in the period. All amounts are INR with two decimal places.</p>
    </Card>
    <div className="flex flex-wrap gap-3">{(['pdf', 'excel', 'preview'] as const).map(kind => <Button key={kind} variant={kind === 'preview' ? 'outline' : 'default'} disabled={!report?.rows.length || Boolean(busy)} onClick={() => void exportReport(kind)}>{busy === kind ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : kind === 'excel' ? <FileSpreadsheet className="mr-2 h-4 w-4" /> : kind === 'preview' ? <Eye className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}{kind === 'pdf' ? 'Download PDF' : kind === 'excel' ? 'Download Excel' : 'Preview actual PDF'}</Button>)}</div>
    {report && <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[['Income', reportMoney(report.income)], ['Expenses', reportMoney(report.expenses)], ['Net savings', reportMoney(report.net)], ['Savings rate', report.savingsRate === null ? 'No income' : `${(report.savingsRate * 100).toFixed(1)}%`]].map(([label, value]) => <Card key={label} className="p-5"><p className="text-sm text-muted-foreground mb-2">{label}</p><p className="text-2xl font-bold tabular-nums">{value}</p></Card>)}</div>
      <p className="text-sm text-muted-foreground">{report.rows.length} transactions included. Net savings is income minus expenses for this period, rather than your all-time balance. Savings rate is net savings divided by income.</p>
      {!report.rows.length && <Card className="p-8 text-center"><h2 className="font-semibold">No transactions in this period</h2><p className="text-sm text-muted-foreground mt-2">Choose another period or add a transaction. Downloads become available when the report contains records.</p></Card>}
      <ReportTable title="Monthly totals" headers={['Month', 'Income', 'Expenses', 'Net savings']} rows={report.monthly.map(m => [m.month, reportMoney(m.income), reportMoney(m.expenses), reportMoney(m.net)])} numeric={[1, 2, 3]} />
      <ReportTable title="Category breakdown" headers={['Category', 'Income', 'Expenses', 'Expense share', 'Entries']} rows={report.categories.filter(c => c.count).map(c => [c.name, reportMoney(c.income), reportMoney(c.spent), `${(c.share * 100).toFixed(1)}%`, c.count])} numeric={[1, 2, 3, 4]} />
      <section className="space-y-3"><ReportTable title="Budget comparison" headers={['Category', 'Period allocation', 'Spent', 'Remaining', 'Status']} rows={report.categories.filter(c => c.limit !== null).map(c => [c.name, reportMoney(c.limit!), reportMoney(c.spent), reportMoney(c.remaining!), c.remaining! < 0 ? 'Over allocation' : 'Within allocation'])} numeric={[1, 2, 3]} /><p className="text-xs text-muted-foreground">Uses current saved monthly limits, prorated by calendar days for partial months and added across the period. Historical limits are not stored. No allocation is shown for categories without a saved budget.</p></section>
      <ReportTable title={`Included transactions (${report.rows.length})`} headers={['Date', 'Description', 'Category', 'Type', 'Amount', 'Repeat']} rows={report.rows.slice((currentPage - 1) * 10, currentPage * 10).map(t => [reportDate(t.date), t.description || 'Untitled', names.get(t.category) ?? 'Uncategorized', t.type === 'income' ? 'Income' : 'Expense', reportMoney(t.amount), t.isRecurring ? t.recurringInterval ?? 'Yes' : 'No'])} numeric={[4]} />
      <nav aria-label="Report transaction pages" className="flex items-center justify-end gap-3 text-sm"><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage} / {pages}</span><Button variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></nav><p className="text-xs text-muted-foreground">Downloads include every transaction in the period, regardless of the table page. Excel includes Summary, Monthly, Categories, Budgets, and Transactions sheets with numeric amounts, date cells, filters, and wrapped descriptions.</p>
    </>}
    {preview && <Card className="p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Generated PDF preview</h2><Button variant="outline" onClick={() => setPreview(null)}>Close preview</Button></div><iframe title="Generated financial report PDF" src={preview.url} className="w-full h-[650px] rounded border bg-white" /><a href={preview.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Open PDF in a new tab if the preview is unavailable</a></Card>}
  </div>;
}
