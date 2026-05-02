"use client";

import type { ReactNode } from "react";

type AnimateInProps = {
  children: ReactNode;
  className?: string;
  hidden?: Record<string, unknown>;
  visible?: Record<string, unknown>;
  transition?: Record<string, unknown>;
  amount?: number;
  once?: boolean;
};

export function AnimateIn({
  children,
  className,
  hidden = { opacity: 0, y: 16 },
  visible = { opacity: 1, y: 0 },
  transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  amount = 0.15,
  once = true,
}: AnimateInProps) {
  void hidden;
  void visible;
  void transition;
  void amount;
  void once;

  return <section className={className}>{children}</section>;
}
