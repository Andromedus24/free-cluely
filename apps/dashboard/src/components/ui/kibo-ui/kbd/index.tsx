import React from "react";
import { cn } from "@/lib/utils";

interface KbdProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Kbd: React.FC<KbdProps> = ({
  children,
  className = "",
  style = {},
  ...props
}) => {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800",
        "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </kbd>
  );
};

interface KbdKeyProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export const KbdKey: React.FC<KbdKeyProps> = ({
  children,
  className = "",
  "aria-label": ariaLabel,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs font-medium text-gray-800",
        "dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
        className
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </span>
  );
};