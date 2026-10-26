import { motion, type MotionValue } from 'motion/react';

const TONES = {
  like: 'text-like',
  nope: 'text-nope',
  super: 'text-super',
} as const;

interface StampProps {
  label: string;
  tone: keyof typeof TONES;
  opacity: MotionValue<number> | number;
  rotate: number;
  className: string;
}

/** Rubber-stamp label that inks in while you drag. */
export function Stamp({ label, tone, opacity, rotate, className }: StampProps) {
  return (
    <motion.span
      aria-hidden="true"
      style={{ opacity, rotate }}
      className={`pointer-events-none absolute z-10 rounded-xl border-[3px] border-current bg-white/75 px-3 py-1 font-display text-[28px] leading-none font-bold tracking-wide uppercase shadow-[inset_0_0_0_2px_rgb(255_255_255/0.75),inset_0_0_0_4px_currentColor] backdrop-blur-[2px] dark:bg-black/45 ${TONES[tone]} ${className}`}
    >
      {label}
    </motion.span>
  );
}
