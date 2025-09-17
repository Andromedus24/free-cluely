"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface HyperTextProps {
  text: string;
  className?: string;
  duration?: number;
}

export const HyperText: React.FC<HyperTextProps> = ({
  text,
  className = "",
  duration = 3000,
}) => {
  const letters = Array.from(text);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.05,
              duration: 0.5,
            }}
            className="inline-block"
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};