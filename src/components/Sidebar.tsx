import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, Receipt, BarChart3, FileText, Settings, HelpCircle, ChevronsRight, ChevronDown, Plus, Wallet } from 'lucide-react';

const items = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Receipt, label: 'Transactions', href: '/transactions' },
  { icon: BarChart3, label: 'Analytics', href: '/charts' },
  { icon: FileText, label: 'Reports', href: '/reports' },
];

export default function Sidebar({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) {
  const [open, setOpen] = useState(true);
  const optionClass = ({ isActive }: { isActive: boolean }) => 'flex h-11 items-center rounded-md border-l-2 text-sm font-medium transition-colors ' + (isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm' : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200');
  return <>
    <aside aria-label="Sidebar" className={`fixed top-0 left-0 z-40 hidden lg:flex h-screen flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm transition-[width] duration-300 ${open ? 'w-64' : 'w-16'}`}>
      <Link to="/settings" aria-label="Workspace settings" className="mb-6 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-1 pb-4 pt-2">
        <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"><Wallet className="h-5 w-5 text-white" /></div>
        {open && <><div className="min-w-0 flex-1"><span className="block text-sm font-semibold">Expenso</span><span className="block text-xs text-gray-500 dark:text-gray-400">Personal Finance</span></div><ChevronDown className="h-4 w-4 text-gray-400" /></>}
      </Link>
      <nav aria-label="Main navigation" className="space-y-1">
        {items.map(({ icon: Icon, label, href }) => <NavLink key={href} to={href} end={href === '/'} aria-label={label} title={!open ? label : undefined} className={optionClass}><span className="grid h-full w-11 shrink-0 place-content-center"><Icon className="h-4 w-4" /></span>{open && <span>{label}</span>}</NavLink>)}
        <Link id="tour-add-btn" to="/add-transaction" aria-label="Add transaction" title={!open ? 'Add transaction' : undefined} className="flex h-11 items-center rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"><span className="grid h-full w-12 shrink-0 place-content-center"><Plus className="h-4 w-4" /></span>{open && <span>Add transaction</span>}</Link>
      </nav>
      <nav aria-label="Account navigation" className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
        {open && <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Account</p>}
        <NavLink to="/settings" aria-label="Settings" title={!open ? 'Settings' : undefined} className={optionClass}><span className="grid h-full w-11 shrink-0 place-content-center"><Settings className="h-4 w-4" /></span>{open && <span>Settings</span>}</NavLink>
        <Link to="/help" aria-label="Help and Support" title={!open ? 'Help & Support' : undefined} className="flex h-11 items-center rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"><span className="grid h-full w-12 shrink-0 place-content-center"><HelpCircle className="h-4 w-4" /></span>{open && <span>Help & Support</span>}</Link>
      </nav>
      <button type="button" aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={open} onClick={() => { setOpen(!open); onCollapseChange?.(open); }} className="-mx-2 mt-auto flex items-center border-t border-gray-200 dark:border-gray-800 px-2 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"><span className="grid size-12 shrink-0 place-content-center"><ChevronsRight className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} /></span>{open && <span className="text-sm font-medium">Hide</span>}</button>
    </aside>
    <nav aria-label="Mobile navigation" className="fixed bottom-0 inset-x-0 z-40 flex h-16 lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-inset-bottom">{[...items, { icon: Settings, label: 'Settings', href: '/settings' }].map(({ icon: Icon, label, href }) => <NavLink key={href} to={href} end={href === '/'} className={({ isActive }) => 'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ' + (isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')}><Icon className="h-5 w-5" />{label}</NavLink>)}</nav>
    <Link to="/add-transaction" aria-label="Add transaction" className="fixed bottom-20 right-4 z-40 lg:hidden grid size-12 place-content-center rounded-full bg-blue-600 text-white shadow-lg"><Plus className="h-5 w-5" /></Link>
  </>;
}
