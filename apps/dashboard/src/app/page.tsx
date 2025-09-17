"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button-enhanced";
import { LiaLongArrowAltRightSolid } from "react-icons/lia";
import { createClient } from "@supabase/supabase-js";
import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@/components/ui/kibo-ui/announcement";
import { ArrowUpRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { TextAnimate } from "@/components/magicui/text-animate";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Target, ArrowRight, Activity, Shield } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showAnnouncement2, setShowAnnouncement2] = useState(false);
  const [session, setSession] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setShowAnnouncement(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowAnnouncement2(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="frosty flex flex-col min-h-screen items-center justify-center relative overflow-hidden">
      <motion.main
        className="flex flex-col items-center justify-center w-full text-white text-center text-3xl mb-9"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Announcement */}
        <div
          className={`transition-opacity duration-700 ${
            showAnnouncement ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Announcement>
            <AnnouncementTag>Latest update</AnnouncementTag>
            <AnnouncementTitle>
              v1.0.0 is live!{" "}
              <ArrowUpRightIcon
                className="shrink-0 text-muted-foreground"
                size={16}
              />
            </AnnouncementTitle>
          </Announcement>
        </div>

        {/* Hero */}
        <div className="text-4xl">
          <div className="mt-6 text-4xl flex flex-row flex-wrap items-center gap-2 justify-center">
            <TextAnimate animation="blurInUp" by="word" delay={0.2}>
              Stop
            </TextAnimate>
            <TextAnimate animation="slideUp" by="character" delay={0.4}>
              flipping
            </TextAnimate>
            <TextAnimate animation="blurInUp" by="word" delay={0.8}>
              through apps.
            </TextAnimate>
          </div>
          <TextAnimate animation="blurInUp" delay={1.5}>
            Everything you need, all in one place.
          </TextAnimate>
        </div>

        {/* Subtext */}
        <div
          className={`mt-6 text-sm text-muted-foreground transition-opacity duration-700 ${
            showAnnouncement2 ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          The AI powered productivity suite for individuals and enterprises.
        </div>

        {/* Continue button */}
        <div className="gap-2 flex flex-row flex-wrap items-center justify-center mt-9">
          <Button
            onClick={() => router.push("/login")}
            variant={"ghost"}
            className="group inline-flex text-sm transition-all cursor-pointer text-muted-foreground hover:text-primary"
          >
            <span className="inline-flex items-center justify-center transition-all group-hover:pr-2 gap-2">
              Continue <LiaLongArrowAltRightSolid />
            </span>
          </Button>
        </div>

        {/* Session info under button */}
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {session ? (
            <div className="flex flex-col gap-2 items-center">
              <p>Logged in as {session.user.email}</p>
              {/* temp log out button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setSession(null);
                }}
              >
                Log out
              </Button>
            </div>
          ) : (
            <p>Not logged in</p>
          )}
        </div>

        {/* Smart Recommendations Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="mt-12 w-full max-w-4xl"
        >
          <Card className="bg-background/10 backdrop-blur-sm border-white/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <Brain className="w-6 h-6 text-primary" />
                Smart App Recommendations
                <Badge variant="secondary" className="bg-primary/20 text-primary-foreground ml-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  New
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Discover AI-powered app suggestions tailored to your workflow
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-background/5 rounded-lg p-4 border border-white/10">
                  <Target className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Personalized</h3>
                  <p className="text-sm text-muted-foreground">
                    AI analyzes your preferences and workflow patterns
                  </p>
                </div>

                <div className="bg-background/5 rounded-lg p-4 border border-white/10">
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Smart</h3>
                  <p className="text-sm text-muted-foreground">
                    Intelligent matching based on usage and compatibility
                  </p>
                </div>

                <div className="bg-background/5 rounded-lg p-4 border border-white/10">
                  <Brain className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Trending</h3>
                  <p className="text-sm text-muted-foreground">
                    Discover popular apps in your industry
                  </p>
                </div>
              </div>

              <Link href="/recommendations">
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  Explore Recommendations
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Real-time Monitoring Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.8 }}
          className="mt-12 w-full max-w-4xl"
        >
          <Card className="bg-background/10 backdrop-blur-sm border-white/10">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-white">
                <Activity className="w-6 h-6 text-primary" />
                Real-time Monitoring
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-100 ml-2">
                  <Shield className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Monitor app connectivity, system health, and performance metrics in real-time
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-background/5 rounded-lg p-4 border border-white/10">
                  <Activity className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Live Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time app connectivity and health monitoring
                  </p>
                </div>

                <div className="bg-background/5 rounded-lg p-4 border border-white/10">
                  <Shield className="w-8 h-8 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Health Checks</h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive system health and performance tracking
                  </p>
                </div>

                <div className="bg-background/5 rounded-lg p-4 border border-white/10">
                  <Target className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Event Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Instant notifications for important system events
                  </p>
                </div>
              </div>

              <Link href="/monitoring">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  View Monitoring Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

      </motion.main>
    </div>
  );
}