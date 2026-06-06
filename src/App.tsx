import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Sun, Moon, Wallet } from 'lucide-react';
import { Toaster } from 'sonner';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Sidebar from './components/Sidebar';
import { useExpenseStore } from './store';

// Applies / removes the `dark` class on <html> whenever theme changes.
const ThemeManager = () => {
  const { theme } = useExpenseStore();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
};

// Global keyboard shortcut: N → open new transaction form.
const KeyboardShortcuts = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'n' && !inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        navigate('/add-transaction');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
  return null;
};

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useExpenseStore();

  return (
    <Router>
      <ThemeManager />
      <KeyboardShortcuts />

      <div className="min-h-screen app-background text-slate-900 dark:text-slate-100">
        <Sidebar onCollapseChange={setIsSidebarCollapsed} />

        <div
          className={`min-h-screen transition-all duration-300 pb-16 lg:pb-0 ${
            isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'
          }`}
        >
          {/* Top nav — visible on all sizes */}
          <nav className="glass-morphism border-b border-slate-200/40 dark:border-slate-700/40 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14 lg:h-16">
                {/* Mobile brand (sidebar hidden on mobile) */}
                <div className="flex items-center gap-2 lg:hidden">
                  <Wallet className="h-5 w-5 text-indigo-600" />
                  <span className="font-bold text-slate-900 dark:text-white">Expenso</span>
                </div>
                <div className="hidden lg:block" />

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors duration-150"
                >
                  {theme === 'dark'
                    ? <Sun className="h-5 w-5 text-amber-400" />
                    : <Moon className="h-5 w-5" />
                  }
                </button>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-transaction" element={<AddTransaction />} />
            </Routes>
          </main>
        </div>
      </div>

      <Toaster
        position="bottom-right"
        richColors
        theme={theme === 'dark' ? 'dark' : 'light'}
        toastOptions={{
          style: { borderRadius: '16px', fontFamily: 'Inter, ui-sans-serif, system-ui' },
        }}
      />
    </Router>
  );
}

export default App;
