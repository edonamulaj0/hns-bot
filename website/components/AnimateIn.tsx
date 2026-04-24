"use client";

import { motion, useInView, type Transition, type Variant } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type AnimateInProps = {
  children: ReactNode;
  className?: string;
  hidden?: Variant;
  visible?: Variant;
  transition?: Transition;
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
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { amount, once });
  const [mounted, setMounted] = useState(false);
  const [animateOnScroll, setAnimateOnScroll] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const inInitialViewport = rect.top < window.innerHeight && rect.bottom > 0;
    setAnimateOnScroll(!inInitialViewport);
  }, []);

  const shouldAnimate = mounted && animateOnScroll;
  const animateState = !shouldAnimate || inView ? "visible" : "hidden";
  const initialState = shouldAnimate ? "hidden" : "visible";
  const variants = {
    hidden,
    visible,
  };

  return (
    <motion.section
      ref={ref}
      className={className}
      variants={variants}
      initial={initialState}
      animate={animateState}
      transition={transition}
    >
      {children}
    </motion.section>
  );
}
