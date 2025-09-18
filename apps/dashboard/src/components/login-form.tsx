"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button-enhanced";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { LoadingButton } from "@/components/ui/loading-states";
import { useGlobalErrorHandling } from "@/providers/ErrorHandlingProvider";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { handleError } = useGlobalErrorHandling();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Use global error handling for auth errors
        handleError(error, {
          type: 'error',
          title: 'Login Failed',
          message: error.message,
          component: 'LoginForm',
          context: { email }
        });
        setError(error.message);
      } else {
        router.push("/home");
      }
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("An unexpected error occurred");

      // Use global error handling for unexpected errors
      handleError(authError, {
        type: 'error',
        title: 'Login Error',
        message: 'An unexpected error occurred during login',
        component: 'LoginForm',
        context: { email }
      });

      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary context="LoginForm">
      <Card className="w-full max-w-md mx-auto bg-neutral-900/50 border-white/10">
        <CardHeader>
        <CardTitle className="text-white text-center">Welcome Back</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="bg-neutral-800 border-white/20 text-white placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="bg-neutral-800 border-white/20 text-white placeholder:text-neutral-500"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <LoadingButton
            type="submit"
            className="w-full bg-white text-black hover:bg-gray-200"
            isLoading={loading}
            loadingText="Signing in..."
          >
            Sign In
          </LoadingButton>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={onToggleMode}
              className="text-neutral-400 hover:text-white"
            >
              Don't have an account? Sign up
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
};