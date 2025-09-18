/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { security } from '@/lib/security';
import { apiService } from './api-service';
import { validate, sanitize } from '@/lib/validation';
import React, { useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  avatar_url?: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

class AuthService {
  private session: AuthSession | null = null;
  private user: AuthUser | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      await this.loadSession();
      this.setupAuthListener();
      this.initialized = true;
      logger.info('Auth service initialized');
    } catch (error) {
      logger.error('Failed to initialize auth service', error);
    }
  }

  private async loadSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (session) {
        this.session = this.transformSession(session);
        this.user = this.transformUser(session.user);

        // Load user profile
        await this.loadUserProfile();
      }
    } catch (error) {
      logger.error('Failed to load auth session', error);
      this.session = null;
      this.user = null;
    }
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', { event });

      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            this.session = this.transformSession(session);
            this.user = this.transformUser(session.user);
            await this.loadUserProfile();
          }
          break;
        case 'SIGNED_OUT':
          this.session = null;
          this.user = null;
          break;
        case 'TOKEN_REFRESHED':
          if (session) {
            this.session = this.transformSession(session);
          }
          break;
        case 'USER_UPDATED':
          if (session?.user) {
            this.user = this.transformUser(session.user);
          }
          break;
      }
    });
  }

  private transformSession(session: any): AuthSession {
    return {
      user: this.transformUser(session.user),
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    };
  }

  private transformUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      email_verified: user.email_confirmed_at !== null,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  private async loadUserProfile() {
    if (!this.user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', this.user.id)
        .single();

      if (error) {
        // Profile doesn't exist, create it
        await this.createUserProfile();
      } else if (data) {
        this.user = {
          ...this.user,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        };
      }
    } catch (error) {
      logger.error('Failed to load user profile', error);
    }
  }

  private async createUserProfile() {
    if (!this.user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .insert([{
          id: this.user.id,
          full_name: this.user.full_name,
          avatar_url: this.user.avatar_url,
          updated_at: new Date().toISOString(),
        }]);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to create user profile', error);
    }
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      // Validate inputs with Zod schema
      const validatedData = validate.user.login(credentials);

      // Sanitize inputs
      const sanitizedData = {
        email: sanitize.input(validatedData.email),
        password: validatedData.password, // Password should not be sanitized
      };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedData.email,
        password: sanitizedData.password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No session returned');
      }

      this.session = this.transformSession(data.session);
      this.user = this.transformUser(data.session.user);

      // Log activity
      await apiService.logActivity('login', 'user', this.user.id);

      logger.info('User logged in successfully', { userId: this.user.id });
      return this.session;
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      // Validate inputs with Zod schema
      const validatedData = validate.user.register(data);

      // Sanitize inputs
      const sanitizedData = {
        email: sanitize.input(validatedData.email),
        password: validatedData.password, // Password should not be sanitized
        full_name: sanitize.input(validatedData.full_name || ''),
        avatar_url: validatedData.avatar_url ? sanitize.input(validatedData.avatar_url) : undefined,
      };

      const { data: authData, error } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
        options: {
          data: {
            full_name: sanitizedData.full_name,
            avatar_url: sanitizedData.avatar_url,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!authData.session) {
        throw new Error('No session returned');
      }

      this.session = this.transformSession(authData.session);
      this.user = this.transformUser(authData.session.user);

      // Create user profile
      await this.createUserProfile();

      // Log activity
      await apiService.logActivity('register', 'user', this.user.id);

      logger.info('User registered successfully', { userId: this.user.id });
      return this.session;
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.user) {
        // Log activity before logout
        await apiService.logActivity('logout', 'user', this.user.id);
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      this.session = null;
      this.user = null;

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  }

  async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      // Validate email
      const validatedData = { email: sanitize.input(data.email) };

      // Basic email validation
      if (!validatedData.email || !validatedData.email.includes('@')) {
        throw new Error('Invalid email format');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      logger.info('Password reset email sent', { email: data.email });
    } catch (error) {
      logger.error('Password reset failed', error);
      throw error;
    }
  }

  async updatePassword(data: UpdatePasswordData): Promise<void> {
    try {
      // Validate passwords with Zod schema
      const validatedData = validate.user.passwordUpdate(data);

      // Verify current password first
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: this.user?.email || '',
        password: validatedData.current_password,
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: validatedData.new_password,
      });

      if (error) {
        throw error;
      }

      logger.info('Password updated successfully');
    } catch (error) {
      logger.error('Password update failed', error);
      throw error;
    }
  }

  async updateProfile(data: UpdateProfileData): Promise<AuthUser> {
    try {
      if (!this.user) {
        throw new Error('No authenticated user');
      }

      // Validate inputs with Zod schema
      const validatedData = validate.user.profileUpdate(data);

      // Sanitize inputs
      const sanitizedData = {
        full_name: validatedData.full_name ? sanitize.input(validatedData.full_name) : undefined,
        avatar_url: validatedData.avatar_url ? sanitize.input(validatedData.avatar_url) : undefined,
        email: validatedData.email ? sanitize.input(validatedData.email) : undefined,
      };

      // Update user metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: sanitizedData.full_name,
          avatar_url: sanitizedData.avatar_url,
        },
      });

      if (authError) {
        throw authError;
      }

      // Update profile in database
      if (sanitizedData.full_name || sanitizedData.avatar_url) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: sanitizedData.full_name,
            avatar_url: sanitizedData.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', this.user.id);

        if (profileError) {
          throw profileError;
        }
      }

      // Update email if changed
      if (sanitizedData.email && sanitizedData.email !== this.user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: sanitizedData.email,
        });

        if (emailError) {
          throw emailError;
        }
      }

      // Refresh user data
      await this.loadSession();

      // Log activity
      await apiService.logActivity('update_profile', 'user', this.user.id);

      logger.info('Profile updated successfully', { userId: this.user.id });
      return this.user!;
    } catch (error) {
      logger.error('Profile update failed', error);
      throw error;
    }
  }

  // Third-party Authentication
  async signInWithGoogle(): Promise<AuthSession> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      // Note: This will redirect to Google OAuth
      // The session will be established after redirect back
      return data as AuthSession;
    } catch (error) {
      logger.error('Google sign-in failed', error);
      throw error;
    }
  }

  async signInWithGitHub(): Promise<AuthSession> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      // Note: This will redirect to GitHub OAuth
      return data as AuthSession;
    } catch (error) {
      logger.error('GitHub sign-in failed', error);
      throw error;
    }
  }

  // Session Management
  async refreshSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        this.session = this.transformSession(data.session);
        logger.info('Session refreshed successfully');
        return this.session;
      }

      return null;
    } catch (error) {
      logger.error('Session refresh failed', error);
      throw error;
    }
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return this.session !== null && this.user !== null;
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  getAccessToken(): string | null {
    return this.session?.access_token || null;
  }

  async isTokenValid(): Promise<boolean> {
    if (!this.session) return false;

    try {
      const { data, error } = await supabase.auth.getUser(this.session.access_token);
      return !error && data.user !== null;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Hook for authentication
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = authService.isAuthenticated();
        const currentUser = authService.getUser();

        setIsAuthenticated(authenticated);
        setUser(currentUser);

        // Check if token is valid
        if (authenticated) {
          const isValid = await authService.isTokenValid();
          if (!isValid) {
            await authService.refreshSession();
          }
        }
      } catch (error) {
        logger.error('Auth check failed', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up auth state listener
    const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      const authenticated = session !== null;
      const currentUser = session ? authService.transformUser(session.user) : null;

      setIsAuthenticated(authenticated);
      setUser(currentUser);
    });

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login: authService.login.bind(authService),
    register: authService.register.bind(authService),
    logout: authService.logout.bind(authService),
    resetPassword: authService.resetPassword.bind(authService),
    updatePassword: authService.updatePassword.bind(authService),
    updateProfile: authService.updateProfile.bind(authService),
    signInWithGoogle: authService.signInWithGoogle.bind(authService),
    signInWithGitHub: authService.signInWithGitHub.bind(authService),
  };
}

export default AuthService;