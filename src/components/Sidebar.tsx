import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Plus,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { 
    icon: <LayoutDashboard className="h-5 w-5" />, 
    label: 'Dashboard', 
    href: '/' 
  },
  { 
    icon: <Plus className="h-5 w-5" />, 
    label: 'Add Transaction', 
    href: '/add-transaction' 
  },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarVariants = {
    expanded: {
      width: '240px',
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
    collapsed: {
      width: '72px',
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  };

  const itemVariants = {
    expanded: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    collapsed: {
      x: -10,
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5 text-slate-900" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial="expanded"
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className={`fixed top-0 left-0 h-full bg-white shadow-lg z-50 flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5 text-slate-900" />
        </button>

        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200">
          <motion.div
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            className="flex items-center space-x-2"
          >
            <span className="font-bold text-xl text-slate-900">Expenso</span>
          </motion.div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4">
          {navItems.map((item, index) => (
            <motion.a
              key={item.label}
              href={item.href}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100 relative group"
            >
              {/* Active indicator */}
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
              
              {/* Icon with rotation animation */}
              <div className="group-hover:rotate-12 transition-transform duration-300">
                {item.icon}
              </div>

              {/* Label */}
              <motion.span
                variants={itemVariants}
                initial={false}
                animate={isCollapsed ? 'collapsed' : 'expanded'}
                className="ml-3 whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            </motion.a>
          ))}
        </nav>
      </motion.aside>
    </>
  );
};

export default Sidebar