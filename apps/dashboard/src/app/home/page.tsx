"use client";

import { useState, useEffect, useRef, JSX, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { GeistMono } from "geist/font/mono";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";
import {
  LogOut,
  Home,
  Settings,
  Grid,
  BarChart2,
  User,
  Search,
  Sun,
  Clock,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Plus,
  MessageCircle,
  ArrowUp,
  GripVertical,
  Mail,
  Calendar,
  MessageSquare,
  Users,
  BarChart3,
  Camera,
  Music,
  Zap,
  Database,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Kbd, KbdKey } from "@/components/ui/kibo-ui/kbd";
import { CommandPaletteModal } from "@/components/CommandPaletteModal";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { LuPlug } from "react-icons/lu";
import { supabase } from "@/lib/supabaseClient";

/* ================= Types ================= */

interface Session {
  user?: {
    id: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

interface Profile {
  full_name: string;
}

/* ============ Main HomePage Component ============ */
export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const router = useRouter();

  /* ---- Supabase session + profile ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else setProfile(null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
    if (!error && data) setProfile(data);
  };

  /* ---- Auth + drag handlers ---- */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full flex frosty text-white overflow-x-hidden">

      {/* Sidebar */}
      <aside className="w-16 flex flex-col justify-between items-center py-6 bg-neutral-900/50 border-r border-white/10">
        <div className="flex flex-col gap-6">
          <div className="p-2">
            <Sun size={24} className="text-white" />
          </div>
          <button onClick={() => router.push('/home')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded bg-white/10">
            <Home size={20} />
          </button>
          <button onClick={() => router.push('/apps')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <LuPlug size={20} />
          </button>
          <button className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <Receipt size={20} />
          </button>
          <button className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <Clock size={20} />
          </button>
          <button className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <FileText size={20} />
          </button>
          <button className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <User size={20} />
          </button>
          <button className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <Settings size={20} />
          </button>
          <button className="p-2 hover:cursor-pointer hover:bg-white/10 rounded" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Search Bar */}
        <div className="px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Search size={16} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Find anything"
              className="bg-transparent text-neutral-400 placeholder-neutral-500 border-none outline-none flex-1 text-sm"
            />
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
          </div>
        </div>

        {/* Dashboard Content (vertical scroll only) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className={`${GeistMono.className} text-4xl font-light tracking-tighter`}>
                Dashboard

                <Kbd style={{ marginLeft: '10px'}}>
                  <KbdKey aria-label="Meta">⌘</KbdKey>
                  <KbdKey>K</KbdKey>
                </Kbd>
              </h1>
              <p className={`${GeistMono.className} text-neutral-400 mt-2 text-sm`}>Welcome back, {profile?.full_name || 'User'}!</p>
            </div>
            <div className="flex items-center gap-3">
              <CommandPaletteModal>
                <button className="p-2 rounded hover:bg-white/10">
                  <div className="w-5 h-2 flex flex-col gap-1">
                    <div className="w-full h-0.5 bg-white/60"></div>
                    <div className="w-full h-0.5 bg-white/60"></div>
                  </div>
                </button>
              </CommandPaletteModal>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-neutral-900/50 border-white/10 hover:border-white/20 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MessageCircle size={24} className="text-blue-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">24</p>
                    <p className="text-xs text-neutral-400">+12% from last week</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">AI Interactions</h3>
                <p className="text-sm text-neutral-400">Chat sessions and AI assistant usage</p>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/50 border-white/10 hover:border-white/20 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Zap size={24} className="text-green-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">89%</p>
                    <p className="text-xs text-neutral-400">Automation success rate</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Automation Tasks</h3>
                <p className="text-sm text-neutral-400">Completed automated workflows</p>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/50 border-white/10 hover:border-white/20 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 size={24} className="text-purple-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">$2.4k</p>
                    <p className="text-xs text-neutral-400">+8% from last month</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Revenue Impact</h3>
                <p className="text-sm text-neutral-400">Estimated value from AI assistance</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-neutral-900/50 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <Camera size={16} />
                    <span className="text-sm">Take Screenshot</span>
                  </button>
                  <button className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <MessageCircle size={16} />
                    <span className="text-sm">Start Chat</span>
                  </button>
                  <button className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <Zap size={16} />
                    <span className="text-sm">Run Automation</span>
                  </button>
                  <button className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <Settings size={16} />
                    <span className="text-sm">Settings</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/50 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <p className="text-sm text-neutral-300">Completed email analysis task</p>
                    <span className="text-xs text-neutral-500 ml-auto">2m ago</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <p className="text-sm text-neutral-300">New plugin installed: Gmail</p>
                    <span className="text-xs text-neutral-500 ml-auto">15m ago</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <p className="text-sm text-neutral-300">AI assistant helped with code review</p>
                    <span className="text-xs text-neutral-500 ml-auto">1h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center gap-6 py-4 mt-8">
            <button className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <BarChart2 size={16} />
              Revenue
            </button>
            <button className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <FileText size={16} />
              Duplicate invoice
            </button>
            <button className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <DollarSign size={16} />
              Expenses
            </button>
            <button className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <Clock size={16} />
              Time track
            </button>
            <button className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <Plus size={16} />
              New task
            </button>
            <button className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
              <FileText size={16} />
              Health report
            </button>
          </div>
        </div>

        {/* Bottom Chat Bar */}
        <div className="px-8 py-4 border-t border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-3 bg-neutral-900/50 px-4 py-3 rounded">
              <input
                type="text"
                placeholder="Ask anything"
                className="bg-transparent text-white placeholder-neutral-500 border-none outline-none flex-1"
              />
              <button className="text-neutral-400 hover:text-white no-drag">
                <Plus size={16} />
              </button>
              <button className="text-neutral-400 hover:text-white no-drag">
                <MessageCircle size={16} />
              </button>
            </div>
            <button className="w-10 h-10 bg-white text-black rounded flex items-center justify-center hover:bg-neutral-200 no-drag">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}