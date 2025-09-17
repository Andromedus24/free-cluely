import React from "react";
import { cn } from "@/lib/utils";

interface AnnouncementProps {
  children: React.ReactNode;
  className?: string;
}

export const Announcement: React.FC<AnnouncementProps> = ({
  children,
  className = ""
}) => {
  return (
    <div className={cn(
      "relative flex h-8 w-full shrink-0 items-center gap-2 overflow-hidden rounded-md border px-4 py-2 text-sm",
      "bg-neutral-900/50 border-white/10 text-white",
      className
    )}>
      {children}
    </div>
  );
};

interface AnnouncementTagProps {
  children: React.ReactNode;
  className?: string;
}

export const AnnouncementTag: React.FC<AnnouncementTagProps> = ({
  children,
  className = ""
}) => {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
      "bg-green-500 text-white border-green-600",
      className
    )}>
      {children}
    </span>
  );
};

interface AnnouncementTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const AnnouncementTitle: React.FC<AnnouncementTitleProps> = ({
  children,
  className = ""
}) => {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {children}
    </div>
  );
};