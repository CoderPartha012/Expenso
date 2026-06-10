import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, IndianRupee, ArrowRightLeft, BarChart2,
  ChevronRight, ChevronLeft, Sparkles, X,
} from 'lucide-react';

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    Icon:    IndianRupee,
    iconBg:  'bg-emerald-500',
    glow:    'shadow-emerald-500/40',
    cardBg:  'bg-emerald-50 dark:bg-emerald-950/40',
    step:    '01',
    title:   'Set Your Monthly Budget',
    desc:    'Define spending limits for each category — Food, Transport, Bills and more. Expenso warns you when you\'re getting close so you stay in control.',
  },
  {
    Icon:    ArrowRightLeft,
    iconBg:  'bg-indigo-500',
    glow:    'shadow-indigo-500/40',
    cardBg:  'bg-indigo-50 dark:bg-indigo-950/40',
    step:    '02',
    title:   'Add Your First Transaction',
    desc:    'Log any income or expense in seconds. Pick a category, set the amount, choose a date, and tap Save. Tap + or press N on your keyboard anytime.',
  },
  {
    Icon:    BarChart2,
    iconBg:  'bg-violet-500',
    glow:    'shadow-violet-500/40',
    cardBg:  'bg-violet-50 dark:bg-violet-950/40',
    step:    '03',
    title:   'See Your Spending Breakdown',
    desc:    'Interactive pie charts, area charts, and bar charts reveal exactly where your money goes. Export a full PDF report in one tap.',
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onLoadSample: () => void;
}

const OnboardingModal = ({ onClose, onLoadSample }: Props) => {
  const [step, setStep]         = useState<-1 | 0 | 1 | 2>(-1); // -1 = welcome screen
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = (next: -1 | 0 | 1 | 2, dir: 1 | -1) => {
    setDirection(dir);
    setStep(next);
  };

  const handleLoadSample = () => {
    onLoadSample();
  };

  const handleStart = () => {
    if (step === -1) { goTo(0, 1); return; }
    if (step === 2)  { onClose();  return; }
    goTo((step + 1) as 0 | 1 | 2, 1);
  };

  const handleBack = () => {
    if (step <= 0) { goTo(-1, -1); return; }
    goTo((step - 1) as -1 | 0 | 1, -1);
  };

  const isWelcome  = step === -1;
  const isLastStep = step === 2;
  const current    = step >= 0 ? STEPS[step] : null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(2, 6, 23, 0.75)', backdropFilter: 'blur(4px)' }}
      >
        <motion.div
          key="onboarding-card"
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{    scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* ── Welcome screen ──────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {isWelcome ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0   }}
                exit={{    opacity: 0, x: 20  }}
                transition={{ duration: 0.22 }}
              >
                {/* Header gradient */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-8 pt-10 pb-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 bottom-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 60%), radial-gradient(circle at 80% 80%, white 0%, transparent 60%)' }} />
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-4 shadow-xl shadow-indigo-900/30">
                      <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome to Expenso</h1>
                    <p className="text-indigo-200 text-sm leading-relaxed">
                      Your personal finance tracker. Know where every rupee goes.
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-8 py-6 space-y-3">
                  {/* Quick feature list */}
                  {[
                    '📊  Budget tracking with alerts',
                    '📋  Log income & expenses instantly',
                    '📈  Charts & exportable PDF reports',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <span>{item}</span>
                    </div>
                  ))}

                  {/* CTA buttons */}
                  <div className="pt-3 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleStart}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm
                                 shadow-sm shadow-indigo-300/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      Get Started — 3 quick steps
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="w-full py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700
                                 text-slate-600 dark:text-slate-400 font-semibold text-sm
                                 hover:border-indigo-300 dark:hover:border-indigo-700
                                 hover:text-indigo-600 dark:hover:text-indigo-400
                                 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Load sample data to explore
                    </button>
                  </div>
                </div>
              </motion.div>

            ) : (
              /* ── Step screen ────────────────────────────────────────── */
              current && (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{    opacity: 0, x: direction > 0 ? -40 : 40 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Step header */}
                  <div className={`${current.cardBg} px-8 pt-8 pb-7 text-center relative`}>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                                 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Step counter */}
                    <div className="flex items-center justify-center gap-1.5 mb-5">
                      {STEPS.map((_, i) => (
                        <div
                          key={i}
                          className={`transition-all duration-300 rounded-full ${
                            i === step
                              ? 'w-6 h-2 bg-indigo-600'
                              : i < step
                                ? 'w-2 h-2 bg-indigo-400'
                                : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${current.iconBg}
                                    shadow-xl ${current.glow} mb-4`}>
                      <current.Icon className="h-8 w-8 text-white" />
                    </div>

                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Step {current.step} of 3
                    </p>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {current.title}
                    </h2>
                  </div>

                  {/* Description + nav */}
                  <div className="px-8 py-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                      {current.desc}
                    </p>

                    <div className="flex gap-2.5 mt-6">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border-2
                                   border-slate-200 dark:border-slate-700
                                   text-slate-500 dark:text-slate-400
                                   hover:border-slate-300 dark:hover:border-slate-600
                                   font-semibold text-sm transition-all active:scale-[0.98]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleStart}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl
                                   bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm
                                   shadow-sm shadow-indigo-300/40 transition-all active:scale-[0.98]"
                      >
                        {isLastStep ? 'Start tracking →' : (<>Next <ChevronRight className="h-4 w-4" /></>)}
                      </button>
                    </div>

                    {/* Sample data link on last step */}
                    {isLastStep && (
                      <button
                        type="button"
                        onClick={handleLoadSample}
                        className="w-full mt-3 text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400
                                   transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="h-3 w-3" />
                        Or load sample data instead
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default OnboardingModal;
