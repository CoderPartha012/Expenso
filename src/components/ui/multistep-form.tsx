import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, IndianRupee, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useExpenseStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Textarea } from './textarea';

const steps = ['Transaction', 'Details', 'Schedule', 'Review'];
const currency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);

export default function MultistepForm() {
  const { categories, transactions, budgets, addTransaction } = useExpenseStore();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState('');
  const [data, setData] = useState({ type: 'expense' as 'income' | 'expense', amount: '', category: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), isRecurring: false, recurringInterval: 'monthly' as 'weekly' | 'monthly' | 'yearly' });
  const update = <K extends keyof typeof data>(key: K, value: typeof data[K]) => { setData(previous => ({ ...previous, [key]: value })); setError(''); };
  const amount = Number(data.amount);
  const validAmount = Number.isFinite(amount) && amount > 0 && /^\d+(\.\d{1,2})?$/.test(data.amount);
  const category = categories.find(c => c.id === data.category);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(data.date) && !Number.isNaN(new Date(data.date + 'T00:00:00').getTime()) && format(new Date(data.date + 'T00:00:00'), 'yyyy-MM-dd') === data.date;
  const valid = [validAmount, Boolean(category && data.description.trim()), validDate, validAmount && Boolean(category && data.description.trim()) && validDate];
  const changeStep = (next: number) => { setError(''); setStep(next); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!valid[step]) { setError('Complete the required fields before continuing.'); return; }
    if (step < steps.length - 1) { changeStep(step + 1); return; }
    submitting.current = true; setIsSubmitting(true);
    try {
      const id = addTransaction({ ...data, amount, description: data.description.trim(), recurringInterval: data.isRecurring ? data.recurringInterval : undefined });
      toast.success('Transaction added', { description: `${currency(amount)} | ${category?.name}` });
      if (data.type === 'expense') {
        const budget = budgets.find(b => b.categoryId === data.category);
        if (budget && data.date.slice(0, 7) === format(new Date(), 'yyyy-MM')) {
          const before = transactions.filter(t => t.type === 'expense' && t.category === data.category && t.date.slice(0, 7) === data.date.slice(0, 7)).reduce((sum, t) => sum + t.amount, 0);
          if (before < budget.limit && before + amount >= budget.limit) toast.warning(`${category?.name} budget reached`, { description: `${currency(before + amount)} spent of ${currency(budget.limit)}` });
          else if (before < budget.limit * 0.8 && before + amount >= budget.limit * 0.8) toast.warning(`${category?.name} budget is over 80% used`);
        }
      }
      navigate(`/transaction/${id}`);
    } catch { setError('Could not save this transaction. Please try again.'); submitting.current = false; setIsSubmitting(false); }
  };
  return <div className="w-full max-w-lg mx-auto py-4 sm:py-8">
    <div className="flex items-center justify-between mb-6"><Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" />Dashboard</Link><span className="text-sm text-muted-foreground">Add transaction</span></div>
    <motion.div className="mb-8" initial={reducedMotion ? false : { opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <ol className="flex justify-between mb-3">{steps.map((title, index) => <li key={title} className="flex flex-col items-center gap-2"><button type="button" aria-label={`Step ${index + 1}: ${title}`} aria-current={index === step ? 'step' : undefined} disabled={index > step || isSubmitting} onClick={() => changeStep(index)} className={cn('grid size-5 place-content-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4', index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted', index === step && 'ring-4 ring-primary/20')}>{index < step && <Check className="h-3 w-3" />}</button><span className={cn('text-xs hidden sm:block', index === step ? 'text-primary font-medium' : 'text-muted-foreground')}>{title}</span></li>)}</ol>
      <div role="progressbar" aria-label="Transaction progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} className="h-1.5 rounded-full bg-muted overflow-hidden"><motion.div className="h-full bg-primary" animate={{ width: `${step / (steps.length - 1) * 100}%` }} transition={{ duration: reducedMotion ? 0 : 0.3 }} /></div>
    </motion.div>
    <Card id="tour-form" className="rounded-3xl overflow-hidden shadow-md"><form onSubmit={submit} noValidate>
      <AnimatePresence mode="wait" initial={false}><motion.div key={step} initial={{ opacity: 0, x: reducedMotion ? 0 : 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -30 }} transition={{ duration: reducedMotion ? 0 : 0.2 }} onAnimationComplete={() => heading.current?.focus()}>
        <CardHeader><p className="text-xs font-medium text-primary mb-2">Step {step + 1} of {steps.length}</p><CardTitle ref={heading} tabIndex={-1} className="outline-none">{['Start with your transaction', 'Add the details', 'Choose a schedule', 'Review your transaction'][step]}</CardTitle><CardDescription>{['Record an income or expense in Indian rupees.', 'Choose a category and describe the transaction.', 'Set the date and whether this transaction repeats.', 'Check everything before saving.'][step]}</CardDescription></CardHeader>
        <CardContent className="space-y-5 min-h-[260px]">
          {step === 0 && <>
            <fieldset><legend className="text-sm font-medium mb-3">Transaction type</legend><RadioGroup value={data.type} onValueChange={value => update('type', value as 'income' | 'expense')} className="grid grid-cols-2 gap-3">{(['expense', 'income'] as const).map(type => <Label key={type} htmlFor={`type-${type}`} className={cn('flex items-center gap-3 p-4 border rounded-xl cursor-pointer', data.type === type && 'border-primary bg-primary/5')}><RadioGroupItem value={type} id={`type-${type}`} />{type === 'expense' ? 'Expense' : 'Income'}</Label>)}</RadioGroup></fieldset>
            <div className="space-y-2"><Label htmlFor="amount">Amount (INR) *</Label><div className="relative"><IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="amount" inputMode="decimal" placeholder="0.00" value={data.amount} onChange={e => update('amount', e.target.value)} aria-describedby="amount-help" aria-invalid={Boolean(data.amount && !validAmount)} className="pl-9" /></div><p id="amount-help" className="text-xs text-muted-foreground">Enter an amount greater than zero, with up to two decimal places.</p>{data.amount && !validAmount && <p className="text-sm text-destructive">Enter a valid rupee amount.</p>}</div>
          </>}
          {step === 1 && <>
            <div className="space-y-2"><Label htmlFor="category">Category *</Label><Select value={data.category} onValueChange={value => update('category', value)}><SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>{categories.length === 0 && <p className="text-sm text-destructive">No categories are available. See <Link className="underline" to="/help">Help &amp; Support</Link> for guidance.</p>}</div>
            <div className="space-y-2"><Label htmlFor="description">Description *</Label><Textarea id="description" placeholder="What was this transaction for?" value={data.description} onChange={e => update('description', e.target.value)} maxLength={500} /><p className="text-xs text-muted-foreground">A short description helps you find this transaction later.</p></div>
          </>}
          {step === 2 && <>
            <div className="space-y-2"><Label htmlFor="date">Transaction date *</Label><Input id="date" type="date" value={data.date} onChange={e => update('date', e.target.value)} aria-invalid={!validDate} /></div>
            <div className="flex items-center gap-3 rounded-xl border p-4"><Checkbox id="recurring" checked={data.isRecurring} onCheckedChange={value => update('isRecurring', value === true)} /><Label htmlFor="recurring">Repeat this transaction</Label></div>
            {data.isRecurring && <div className="space-y-2"><Label htmlFor="interval">Repeat interval</Label><Select value={data.recurringInterval} onValueChange={value => update('recurringInterval', value as typeof data.recurringInterval)}><SelectTrigger id="interval"><SelectValue /></SelectTrigger><SelectContent>{['weekly', 'monthly', 'yearly'].map(interval => <SelectItem key={interval} value={interval}>{interval[0].toUpperCase() + interval.slice(1)}</SelectItem>)}</SelectContent></Select></div>}
          </>}
          {step === 3 && <dl className="space-y-4 rounded-xl bg-muted/50 p-4 text-sm">{[['Type', data.type === 'expense' ? 'Expense' : 'Income'], ['Amount', currency(amount)], ['Category', category?.name ?? 'Select a category'], ['Description', data.description], ['Date', validDate ? format(new Date(data.date + 'T00:00:00'), 'dd MMM yyyy') : 'Choose a date'], ['Repeat', data.isRecurring ? data.recurringInterval : 'Does not repeat']].map(([label, value]) => <div key={label} className="flex justify-between gap-6"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium text-right break-words min-w-0">{value}</dd></div>)}</dl>}
        </CardContent>
      </motion.div></AnimatePresence>
      {error && <p role="alert" className="px-6 text-sm text-destructive">{error}</p>}
      <CardFooter className="flex justify-between gap-3 pt-6 pb-6"><Button type="button" variant="outline" disabled={step === 0 || isSubmitting} onClick={() => changeStep(step - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button><Button type="submit" disabled={!valid[step] || isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : step === steps.length - 1 ? <><Check className="mr-2 h-4 w-4" />Save transaction</> : <>Next<ChevronRight className="ml-1 h-4 w-4" /></>}</Button></CardFooter>
    </form></Card>
  </div>;
}
