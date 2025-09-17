"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button-enhanced";

interface CommandPaletteModalProps {
  children: React.ReactNode;
}

interface Command {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: "settings",
      name: "Settings",
      description: "Open settings panel",
      icon: Command,
      action: () => {
        console.log("Opening settings...");
        setOpen(false);
      },
    },
    {
      id: "search",
      name: "Search",
      description: "Search across your data",
      icon: Search,
      action: () => {
        console.log("Opening search...");
        setOpen(false);
      },
    },
  ];

  const filteredCommands = commands.filter(command =>
    command.name.toLowerCase().includes(search.toLowerCase()) ||
    command.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900/95 border-white/10 backdrop-blur-lg">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-neutral-400" />
            <Input
              ref={inputRef}
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none text-white placeholder:text-neutral-500 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            {filteredCommands.map((command) => {
              const Icon = command.icon;
              return (
                <Button
                  key={command.id}
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-white/10"
                  onClick={command.action}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{command.name}</span>
                    <span className="text-xs text-neutral-400">{command.description}</span>
                  </div>
                </Button>
              );
            })}

            {filteredCommands.length === 0 && (
              <div className="text-center text-neutral-400 py-4">
                No commands found
              </div>
            )}
          </div>

          <div className="text-xs text-neutral-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-white/10 rounded">⌘K</kbd> to open
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};