import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useExpenseStore } from '../store';
import { Button } from './ui/button';
const steps = [
  { path: '/', target: 'tour-metrics', title: 'Your dashboard', text: 'Total Balance includes all recorded income minus expenses. Monthly Income, Monthly Expenses, and Savings Rate use the current calendar month. Monetary values are in Indian rupees.' },
  { path: '/', target: 'tour-transactions', title: 'Recent activity and quick stats', text: 'Open one of your five latest transactions or choose View all. Quick Stats shows savings rate, income spent, and budget usage; Top Spending Categories ranks current-month expenses.' },
  { path: '/add-transaction', target: 'tour-form', title: 'A four-step transaction form', text: 'Transaction: choose income or expense and an amount. Details: category and description. Schedule: date and optional repeat interval. Review: check and Save transaction. This tour does not add transactions.' },
  { path: '/transactions', target: 'tour-table', title: 'Filter, sort, select, and export', text: 'Filter by type and sort the table. Each page holds ten rows. Select all affects only the current page and preserves other selections. Export selected rows in the active filter, or all filtered rows when nothing is selected. Open a row for its detail modal.' },
  { path: '/charts', target: 'tour-analytics', title: 'Two charts, one month selector', text: 'The line chart shows six months of income, expenses, and net savings ending in your chosen month. The donut shows expenses for that month by category. Hover or focus to inspect amounts and percentages. Download line totals as CSV.' },
  { path: '/reports', target: 'tour-reports', title: 'Download a report', text: 'Choose a reporting period, review the preview, and download PDF or Excel. A period with no transactions cannot be exported. Reports include saved budgets when available.' },
  { path: '/settings', target: 'tour-settings', title: 'Appearance and local data', text: 'Switch light and dark mode and review your transaction count. Data is stored in this browser, with no account or cross-device sync. Download reference copies before clearing site data.' },
  { path: '/help', target: 'tour-help', title: 'Help whenever you need it', text: 'Use the sample walkthrough, searchable guides, FAQs, and troubleshooting tips. Replay this tour or the welcome introduction here. The support form creates a local demo request; no message is sent to a support team.' },
];
export default function AppTour() {
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const setToured = useExpenseStore(state => state.setToured);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    navigate(steps[step].path);
    heading.current?.focus();
    const timer = window.setTimeout(() => {
      const element = document.getElementById(steps[step].target);
      element?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [step, navigate]);
  return <dialog ref={dialog} aria-labelledby="tour-title" onCancel={() => setToured()} className="fixed inset-auto bottom-4 right-4 m-0 w-[calc(100%-2rem)] max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border bg-card text-card-foreground p-0 shadow-2xl backdrop:bg-black/40">
    <div className="flex items-center justify-between bg-blue-600 text-white px-5 py-3"><span className="text-xs font-medium">Guided tour {step + 1} of {steps.length}</span><button type="button" aria-label="Close guided tour" onClick={() => setToured()} className="p-1 rounded hover:bg-white/20"><X className="h-4 w-4" /></button></div>
    <div className="p-5"><h2 id="tour-title" ref={heading} tabIndex={-1} className="font-semibold text-lg outline-none mb-2">{steps[step].title}</h2><p className="text-sm leading-relaxed text-muted-foreground">{steps[step].text}</p><div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => setToured()} className="text-xs text-muted-foreground hover:underline">Skip tour</button><div className="flex gap-2"><Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" />Back</Button><Button onClick={() => step === steps.length - 1 ? setToured() : setStep(step + 1)}>{step === steps.length - 1 ? 'Finish' : 'Next'}<ChevronRight className="h-4 w-4" /></Button></div></div></div>
  </dialog>;
}
