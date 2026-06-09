import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useExpenseStore } from '../store';

// ─── Step definitions ─────────────────────────────────────────────────────────

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TourStep {
  targetId: string;
  title: string;
  body: string;
  placement: Placement;
}

const STEPS: TourStep[] = [
  {
    targetId:  'tour-metrics',
    title:     'Your Financial Overview',
    body:      'These 4 cards show your total balance, monthly income, expenses, and savings rate — all updated in real time.',
    placement: 'bottom',
  },
  {
    targetId:  'tour-add-btn',
    title:     'Add a Transaction',
    body:      'Click here (or press N) to log any income or expense. Choose a category, amount, date, and payment method.',
    placement: 'right',
  },
  {
    targetId:  'tour-transactions',
    title:     'Transaction History',
    body:      'All your transactions appear here. Use the filter icon to narrow by date or category. Swipe left on mobile to delete.',
    placement: 'top',
  },
  {
    targetId:  'tour-chart',
    title:     'Analytics & Reports',
    body:      'Switch between pie, area, and bar charts to understand your spending. Export a full PDF report from the Reports page.',
    placement: 'left',
  },
];

const TOOLTIP_W   = 300;
const TOOLTIP_H   = 160; // estimated
const SPOTLIGHT_P = 10;  // padding around the highlighted element

// ─── Position calculation ─────────────────────────────────────────────────────

const calcTooltip = (rect: DOMRect, placement: Placement) => {
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const gap = 16;
  const style: React.CSSProperties = { position: 'fixed', width: TOOLTIP_W };

  switch (placement) {
    case 'bottom':
      style.top  = Math.min(rect.bottom + SPOTLIGHT_P + gap, vh - TOOLTIP_H - 8);
      style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8));
      break;
    case 'top':
      style.bottom = Math.max(8, vh - rect.top + SPOTLIGHT_P + gap);
      style.left   = Math.max(8, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 8));
      break;
    case 'right':
      style.top  = Math.max(8, Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, vh - TOOLTIP_H - 8));
      style.left = Math.min(rect.right + SPOTLIGHT_P + gap, vw - TOOLTIP_W - 8);
      break;
    case 'left':
      style.top   = Math.max(8, Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, vh - TOOLTIP_H - 8));
      style.right = Math.max(8, vw - (rect.left - SPOTLIGHT_P - gap));
      break;
  }

  return style;
};

// ─── Component ────────────────────────────────────────────────────────────────

const AppTour = () => {
  const { hasToured, setToured } = useExpenseStore();
  const [step,       setStep]    = useState(0);
  const [rect,       setRect]    = useState<DOMRect | null>(null);

  const currentStep = STEPS[step];

  const measureTarget = useCallback(() => {
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      // Small delay to let scroll finish before measuring
      setTimeout(() => {
        setRect(el.getBoundingClientRect());
      }, 350);
    } else {
      setRect(null);
    }
  }, [currentStep.targetId]);

  useEffect(() => {
    if (hasToured) return;
    measureTarget();
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [hasToured, measureTarget]);

  if (hasToured) return null;

  const done  = () => setToured();
  const next  = () => { if (step === STEPS.length - 1) { done(); } else { setStep(s => s + 1); } };
  const prev  = () => { if (step > 0) setStep(s => s - 1); };

  const isLast = step === STEPS.length - 1;

  const spotX = rect ? rect.left   - SPOTLIGHT_P : 0;
  const spotY = rect ? rect.top    - SPOTLIGHT_P : 0;
  const spotW = rect ? rect.width  + SPOTLIGHT_P * 2 : 0;
  const spotH = rect ? rect.height + SPOTLIGHT_P * 2 : 0;

  const tooltipStyle = rect ? calcTooltip(rect, currentStep.placement) : { display: 'none' };

  return createPortal(
    <AnimatePresence>
      <div
        key="tour-overlay"
        className="fixed inset-0 z-[150]"
        style={{ pointerEvents: 'none' }}
      >
        {/* SVG spotlight overlay — dims everything except the target */}
        {rect && (
          <svg
            width="100%"
            height="100%"
            className="absolute inset-0"
            style={{ pointerEvents: 'all' }}
            onClick={(e) => { if (e.target === e.currentTarget) done(); }}
          >
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotX} y={spotY} width={spotW} height={spotH}
                  rx="10" fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%" height="100%"
              fill="rgba(2, 6, 23, 0.65)"
              mask="url(#tour-spotlight-mask)"
            />
            {/* Spotlight border */}
            <rect
              x={spotX} y={spotY} width={spotW} height={spotH}
              rx="10" fill="none"
              stroke="rgba(99, 102, 241, 0.8)" strokeWidth="2"
            />
          </svg>
        )}

        {/* Tooltip card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{    opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18 }}
          style={{ ...tooltipStyle, pointerEvents: 'all' }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          {/* Top strip */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === step ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={done}
              className="p-0.5 rounded-md text-indigo-300 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              {currentStep.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {currentStep.body}
            </p>
          </div>

          {/* Footer nav */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {step + 1} / {STEPS.length}
            </span>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700
                             text-slate-500 dark:text-slate-400 text-xs font-semibold
                             hover:border-slate-300 dark:hover:border-slate-600 transition-colors
                             flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700
                           text-white text-xs font-semibold transition-colors
                           flex items-center gap-1 shadow-sm shadow-indigo-300/30"
              >
                {isLast ? 'Done' : 'Next'}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AppTour;
