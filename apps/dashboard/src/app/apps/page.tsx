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

import { SiGmail, SiGooglecalendar } from "react-icons/si";
import { FaSlack } from "react-icons/fa";
import { RiNotionFill } from "react-icons/ri";
import { FaHubspot, FaCcStripe, FaShopify, FaTrello} from "react-icons/fa";
import { DiGoogleAnalytics } from "react-icons/di";
import { BsMicrosoftTeams } from "react-icons/bs";

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

/* ============ App Data ============ */
const APPS = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Manage your emails and stay connected',
    logo: SiGmail,
    enabled: true,
    category: 'Communication'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Schedule meetings and track events',
    logo: SiGooglecalendar,
    enabled: false,
    category: 'Productivity'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and collaboration',
    logo: FaSlack,
    enabled: true,
    category: 'Communication'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace for notes and docs',
    logo: RiNotionFill,
    enabled: false,
    category: 'Productivity'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Customer relationship management',
    logo: FaHubspot,
    enabled: true,
    category: 'Sales'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing and billing',
    logo: FaCcStripe,
    enabled: true,
    category: 'Finance'
  },
  {
    id: 'analytics',
    name: 'Google Analytics',
    description: 'Website traffic and performance insights',
    logo: DiGoogleAnalytics,
    enabled: false,
    category: 'Analytics'
  },

  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    description: 'Video conferencing and team chat',
    logo: BsMicrosoftTeams,
    enabled: false,
    category: 'Communication'
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce platform and online store',
    logo: FaShopify,
    enabled: false,
    category: 'E-commerce'
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Project management with boards and cards',
    logo: FaTrello,
    enabled: true,
    category: 'Productivity'
  },
];

/* ============ App Integrations Component ============ */
function AppIntegrationsGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [appStates, setAppStates] = useState<Record<string, boolean>>(
    APPS.reduce((acc, app) => ({
      ...acc,
      [app.id]: app.enabled
    }), {} as Record<string, boolean>)
  );

  // Filter apps based on search query
  const filteredApps = useMemo(() => {
    if (!searchQuery) return APPS;

    const query = searchQuery.toLowerCase();
    return APPS.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      app.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleToggle = (appId: string) => {
    setAppStates(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  return (
    <div className="w-full space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search app integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${GeistMono.className} pl-10 bg-neutral-900/50 border-white/10 text-white placeholder:text-neutral-500 focus:border-white/20`}
          style={{ borderRadius: '0px' }}
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-neutral-400 font-mono">
          {filteredApps.length} result{filteredApps.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map((app) => {
          const LogoIcon = app.logo;
          return (
            <Card key={app.id} className="bg-neutral-900/50 border-white/10 hover:border-white/20 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  {/* Logo and Toggle Row */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white/10 flex items-center justify-center">
                      <LogoIcon className="w-6 h-6 text-white" />
                    </div>
                    <Switch
                      checked={appStates[app.id]}
                      onCheckedChange={() => handleToggle(app.id)}
                    />
                  </div>

                  {/* App Info */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-white text-sm font-mono">
                      {app.name}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 font-mono">
                      {app.description}
                    </p>
                    <div>
                      <span className="inline-block px-2 py-1 bg-white/5 rounded text-xs text-neutral-300 font-mono">
                        {app.category}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredApps.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No apps found</h3>
          <p className="text-neutral-400">
            Try adjusting your search terms or browse all available integrations.
          </p>
        </div>
      )}
    </div>
  );
}

/* ============ Main HomePage Component ============ */
export default function AppsPage() {
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
          <button onClick={() => router.push('/home')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded">
            <Home size={20} />
          </button>
          <button onClick={() => router.push('/apps')} className="p-2 hover:cursor-pointer hover:bg-white/10 rounded bg-white/10">
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
                Manage Apps

                <Kbd style={{ marginLeft: '10px'}}>
                  <KbdKey aria-label="Meta">⌘</KbdKey>
                  <KbdKey>K</KbdKey>
                </Kbd>
              </h1>
              <p className={`${GeistMono.className} text-neutral-400 mt-2 text-sm`}>add, edit or remove your app integrations here.</p>
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

          {/* App Integrations Grid */}
          <AppIntegrationsGrid />

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