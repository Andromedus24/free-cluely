"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TextAnimateProps {
  children: React.ReactNode;
  animation?: "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "blurInUp" | "blurInDown" | "fadeIn" | "zoomIn";
  delay?: number;
  duration?: number;
  className?: string;
  by?: "word" | "character" | "line";
}

export const TextAnimate: React.FC<TextAnimateProps> = ({
  children,
  animation = "slideUp",
  delay = 0,
  duration = 0.5,
  className = "",
  by = "word",
}) => {
  const [text, setText] = useState<string>("");
  const [elements, setElements] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (typeof children === "string") {
      setText(children);
    }
  }, [children]);

  useEffect(() => {
    if (!text) return;

    const getAnimationVariants = () => {
      switch (animation) {
        case "slideUp":
          return {
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          };
        case "slideDown":
          return {
            hidden: { opacity: 0, y: -20 },
            visible: { opacity: 1, y: 0 },
          };
        case "slideLeft":
          return {
            hidden: { opacity: 0, x: 20 },
            visible: { opacity: 1, x: 0 },
          };
        case "slideRight":
          return {
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 },
          };
        case "blurInUp":
          return {
            hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          };
        case "blurInDown":
          return {
            hidden: { opacity: 0, y: -20, filter: "blur(10px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          };
        case "fadeIn":
          return {
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          };
        case "zoomIn":
          return {
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1 },
          };
        default:
          return {
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          };
      }
    };

    const variants = getAnimationVariants();

    const splitText = () => {
      switch (by) {
        case "character":
          return text.split("").map((char, index) => (
            <motion.span
              key={index}
              variants={variants}
              initial="hidden"
              animate="visible"
              transition={{
                delay: delay + index * 0.02,
                duration,
              }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ));
        case "word":
          return text.split(" ").map((word, index) => (
            <motion.span
              key={index}
              variants={variants}
              initial="hidden"
              animate="visible"
              transition={{
                delay: delay + index * 0.1,
                duration,
              }}
              className="inline-block mr-2"
            >
              {word}
            </motion.span>
          ));
        case "line":
          return text.split("\n").map((line, index) => (
            <motion.div
              key={index}
              variants={variants}
              initial="hidden"
              animate="visible"
              transition={{
                delay: delay + index * 0.1,
                duration,
              }}
              className="block"
            >
              {line}
            </motion.div>
          ));
        default:
          return [<span key="default">{text}</span>];
      }
    };

    setElements(splitText());
  }, [text, animation, delay, duration, by]);

  return (
    <motion.div className={className}>
      {elements}
    </motion.div>
  );
};