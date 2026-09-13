"use client";
import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DonutChartSegment { id?: string; label: string; color: string; value: number }
export function DonutChart({ data, size = 250, strokeWidth = 30, centerContent, onSegmentHover, className }: { data: DonutChartSegment[]; size?: number; strokeWidth?: number; centerContent?: ReactNode; onSegmentHover?: (segment: DonutChartSegment | null) => void; className?: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const total = data.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const select = (segment: DonutChartSegment | null) => { setHovered(segment?.id ?? segment?.label ?? null); onSegmentHover?.(segment); };
  return <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }} onMouseLeave={() => select(null)}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible -rotate-90" aria-label="Expense breakdown by category">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border) / 0.5)" strokeWidth={strokeWidth} />
      {data.map(segment => {
        if (segment.value <= 0 || !total) return null;
        const length = segment.value / total * circumference;
        const start = offset; offset += length;
        const active = hovered === (segment.id ?? segment.label);
        return <motion.circle key={segment.id ?? segment.label} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={segment.color} strokeWidth={strokeWidth} strokeDasharray={`${Math.max(0, length - (data.length > 1 ? 2 : 0))} ${circumference}`} strokeDashoffset={-start} initial={reduceMotion ? false : { opacity: 0, strokeDashoffset: circumference }} animate={{ opacity: 1, strokeDashoffset: -start }} transition={{ duration: reduceMotion ? 0 : 0.7 }} tabIndex={0} role="img" aria-label={`${segment.label}: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(segment.value)}, ${(segment.value / total * 100).toFixed(1)} percent`} className="cursor-pointer focus:outline-none" style={{ filter: active ? `drop-shadow(0 0 5px ${segment.color}) brightness(1.1)` : 'none' }} onMouseEnter={() => select(segment)} onFocus={() => select(segment)} onBlur={() => select(null)}><title>{segment.label}: {(segment.value / total * 100).toFixed(1)}%</title></motion.circle>;
      })}
    </svg>
    <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center" style={{ width: size - strokeWidth * 2.5 }}>{centerContent}</div>
  </div>;
}
