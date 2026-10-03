"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.8,
  format = (n) => Math.round(n).toLocaleString(),
  className = "",
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  const display = useTransform(spring, (current) => format(current));
  const [displayValue, setDisplayValue] = useState(format(0));
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      spring.set(value);
      initialized.current = true;
    } else {
      spring.set(value);
    }
  }, [value, spring]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setDisplayValue(v));
    return unsub;
  }, [display]);

  return (
    <motion.span className={`tabular-nums ${className}`}>
      {displayValue}
    </motion.span>
  );
}
