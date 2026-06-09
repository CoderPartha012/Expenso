import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Plus,
  Receipt,
  BarChart2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { useExpenseStore } from '../store';

interface NavItem {
  icon: React.ElementType;
  label: string;
  mobileLabel: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',    mobileLabel: 'Home',     href: '/'             },
  { icon: Receipt,         label: 'Transactions', mobileLabel: 'History',  href: '/transactions' },
  { icon: FileText,        label: 'Reports',      mobileLabel: 'Reports',  href: '/reports'      },
  { icon: BarChart2,       label: 'Analytics',    mobileLabel: 'Charts',   href: '/charts'       },
  { icon: Settings,        label: 'Settings',     mobileLabel: 'Settings', href: '/settings'     },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

const Sidebar = ({ onCollapseChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { theme, toggleTheme } = useExpenseStore();

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapseChange?.(next);
  };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 h-full z-50 hidden lg:flex flex-col overflow-hidden
                   bg-white dark:bg-slate-900
                   border-r border-slate-100 dark:border-slate-800
                   shadow-lg dark:shadow-slate-900/50"
      >
        {/* User avatar */}
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
            <User className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden min-w-0"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">My Account</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">Personal Finance</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logo */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-5 pt-4 pb-1 flex items-center gap-2"
            >
              <Wallet className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <span className="font-bold text-lg text-slate-900 dark:text-white whitespace-nowrap">Expenso</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add */}
        <div className={`px-3 pt-3 pb-1 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            id="tour-add-btn"
            onClick={() => navigate('/add-transaction')}
            title="Quick Add"
            className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                        text-white rounded-xl shadow-sm shadow-indigo-300/40 transition-colors
                        ${isCollapsed ? 'p-2.5' : 'w-full px-4 py-2.5'}`}
          >
            <Plus className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Quick Add</span>}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                title={isCollapsed ? item.label : undefined}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                            transition-colors duration-150 group
                            ${isActive
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                            }
                            ${isCollapsed ? 'justify-center' : ''}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full"
                  />
                )}
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer: theme toggle + collapse */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl
                        text-slate-400 dark:text-slate-500
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        hover:text-slate-700 dark:hover:text-slate-300
                        transition-colors duration-150
                        ${isCollapsed ? 'justify-center' : ''}`}
          >
            {theme === 'dark'
              ? <Sun  className="h-5 w-5 flex-shrink-0 text-amber-400" />
              : <Moon className="h-5 w-5 flex-shrink-0" />
            }
            {!isCollapsed && (
              <span className="text-sm">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            )}
          </button>

          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl
                        text-slate-400 dark:text-slate-500
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        hover:text-slate-700 dark:hover:text-slate-300
                        transition-colors duration-150
                        ${isCollapsed ? 'justify-center' : ''}`}
          >
            {isCollapsed
              ? <ChevronRight className="h-5 w-5" />
              : <><ChevronLeft className="h-5 w-5" /><span className="text-sm">Collapse</span></>
            }
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile Bottom Navigation (4 items) ──────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
                      bg-white dark:bg-slate-900
                      border-t border-slate-200 dark:border-slate-800
                      safe-area-inset-bottom">
        <div className="flex items-stretch h-16">
          {navItems.map(item => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 relative
                            transition-colors duration-150
                            ${isActive
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-b-full"
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile FAB (floating above bottom nav) ───────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/add-transaction')}
        title="Add transaction"
        className="fixed bottom-20 right-4 z-50 lg:hidden
                   w-14 h-14 rounded-full bg-indigo-600
                   flex items-center justify-center
                   shadow-lg shadow-indigo-500/40
                   hover:bg-indigo-700 active:scale-95
                   transition-all duration-150"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>
    </>
  );
};

export default Sidebar;
