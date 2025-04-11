import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Sidebar from './components/Sidebar';
import { motion } from 'framer-motion';

function App() {
  return (
    <Router>
      <div className="min-h-screen app-background text-slate-900">
        <Sidebar />
        
        <div className="lg:ml-[240px] min-h-screen">
          <nav className="glass-morphism border-b border-slate-200/20 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-end h-16 items-center">
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-transaction" element={<AddTransaction />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;