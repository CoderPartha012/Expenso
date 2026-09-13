import { useEffect, useRef, useState } from 'react';
import { useExpenseStore } from '../store';
import { Wallet, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
const screens = [
  { title: 'Welcome to Expenso', text: 'Track income and expenses in Indian rupees. Your dashboard, transaction history, analytics, and reports work together to show where your money goes.' },
  { title: 'Record a transaction in four steps', text: 'Choose Expense or Income and enter an INR amount. Add a category and description, choose a date and optional repeat interval, then review and save. Use Add transaction or press N when you are not typing.' },
  { title: 'Explore your transaction history', text: 'Filter by income or expense, sort by date, amount, or description, and select rows across pages. Export selected or filtered transactions as CSV or JSON. Open a row for a quick view, then open its full page to edit or delete.' },
  { title: 'Understand your finances', text: 'Analytics shows six-month income, expense, and net savings lines plus a monthly spending donut. Choose a month, hover or focus a category, and export line-chart totals. Reports offers PDF and Excel downloads. Visit Help & Support for a sample walkthrough and FAQs.' },
];
export default function OnboardingModal({ onClose, onLoadSample }: { onClose: () => void; onLoadSample: () => void }) {
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const transactions = useExpenseStore(state => state.transactions);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="welcome-title" className="w-[calc(100%-2rem)] max-w-md rounded-3xl bg-card text-card-foreground p-0 border shadow-2xl backdrop:bg-black/60">
    <div className="relative bg-blue-600 p-8 text-white"><button type="button" aria-label="Skip introduction" onClick={onClose} className="absolute top-4 right-4 p-1 rounded hover:bg-white/20"><X className="h-4 w-4" /></button><Wallet className="h-9 w-9 mb-5" /><p className="text-xs text-blue-100 mb-2">Introduction {step + 1} of {screens.length}</p><h2 ref={heading} tabIndex={-1} id="welcome-title" className="text-2xl font-bold outline-none">{screens[step].title}</h2></div>
    <div className="p-8"><p className="text-sm leading-relaxed text-muted-foreground min-h-28">{screens[step].text}</p><div className="flex gap-2 my-6">{screens.map((_, i) => <span key={i} className={'h-1.5 flex-1 rounded-full ' + (i <= step ? 'bg-blue-600' : 'bg-muted')} />)}</div><div className="flex justify-between gap-3"><Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button><Button onClick={() => step === screens.length - 1 ? onClose() : setStep(step + 1)}>{step === screens.length - 1 ? 'Start guided tour' : 'Next'}<ChevronRight className="h-4 w-4 ml-1" /></Button></div>{transactions.length === 0 && <button type="button" onClick={onLoadSample} className="mt-5 w-full text-xs text-primary hover:underline">Explore with sample transactions instead</button>}<p className="mt-4 text-xs text-muted-foreground">Saved in this browser. You can replay this introduction from Help & Support.</p></div>
  </dialog>;
}
