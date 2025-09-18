"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GeistMono } from "geist/font/mono";
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
  Trello,
} from "lucide-react";
import { Kbd, KbdKey } from "@/components/ui/kibo-ui/kbd";
import { CommandPaletteModal } from "@/components/CommandPaletteModal";
import { supabase } from "@/lib/supabaseClient";
import { BoardsPage } from "@/components/boards/BoardsPage";
import { BoardSystemInterface } from "../../../../packages/boards/src/interfaces/BoardSystemInterface";
import { createBoardSystemService } from "../../../../packages/boards/src/core/BoardSystemService";

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

/* ============ Main Boards Page Component ============ */
export default function BoardsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [boardSystem, setBoardSystem] = useState<BoardSystemInterface | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  /* ---- Supabase session + profile ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
        initializeBoardSystem(data.session.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        fetchProfile(s.user.id);
        initializeBoardSystem(s.user.id);
      } else {
        setProfile(null);
        setBoardSystem(null);
      }
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

  const initializeBoardSystem = async (userId: string) => {
    try {
      const system = await createBoardSystemService(userId);
      setBoardSystem(system);
    } catch (error) {
      console.error('Error initializing board system:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Auth handlers ---- */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleBoardSelect = (board: { id: string; name: string }) => {
    // Navigate to board view
    router.push(`/boards/${board.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex frosty text-white overflow-x-hidden">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!session || !boardSystem) {
    return (
      <div className="min-h-screen w-full flex frosty text-white overflow-x-hidden">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login to Access Boards
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex frosty text-white overflow-x-hidden">

      {/* Sidebar */}
      <aside className="w-16 flex flex-col justify-between items-center py-6 bg-neutral-900/50 border-r border-white/10">
        <div className="flex flex-col gap-6">
          <div className="p-2">
            <Sun size={24} className="text-white" />
          </div>
          <button onClick={() => router.push('/home')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <Home size={20} />
          </button>
          <button onClick={() => router.push('/apps')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <Trello size={20} />
          </button>
          <button onClick={() => router.push('/boards')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded bg-white/10">
            <Trello size={20} />
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
                Boards

                <Kbd style={{ marginLeft: '10px'}}>
                  <KbdKey aria-label="Meta">⌘</KbdKey>
                  <KbdKey>B</KbdKey>
                </Kbd>
              </h1>
              <p className={`${GeistMono.className} text-neutral-400 mt-2 text-sm`}>manage your project boards and workflows.</p>
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

          {/* Boards Management */}
          <BoardsPage
            userId={session.user!.id}
            boardSystem={boardSystem}
            onBoardSelect={handleBoardSelect}
          />
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