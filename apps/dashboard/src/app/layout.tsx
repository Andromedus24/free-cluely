import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { VoiceAssistantProvider } from '@/components/voice-assistant';
import { ProductivityProvider } from '@/components/productivity-monitoring';
import { KnowledgeProvider } from '@/contexts/knowledge-context';
import { MessagingProvider } from '@/contexts/messaging-context';
import { ModelingProvider } from '@/contexts/3d-modeling-context';
import { ErrorHandlingProvider } from '@/providers/error-handling-provider';
import { ConfigValidationBanner } from '@/components/config-validation-banner';
import { validateConfig } from '@/lib/config-validator';

export const metadata: Metadata = {
  title: 'Atlas - AI-Powered Productivity Suite',
  description: 'Everything you need, all in one place. AI-powered productivity suite for individuals and enterprises.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ErrorBoundary context="root-layout">
            <ConfigValidationBanner />
            <ErrorHandlingProvider>
              <ErrorBoundary context="providers">
                <VoiceAssistantProvider>
                  <ProductivityProvider>
                    <KnowledgeProvider>
                      <MessagingProvider>
                        <ModelingProvider>
                          <div className="min-h-screen bg-background text-foreground">
                            <ErrorBoundary context="main-content">
                              {children}
                            </ErrorBoundary>
                          </div>
                        </ModelingProvider>
                      </MessagingProvider>
                    </KnowledgeProvider>
                  </ProductivityProvider>
                </VoiceAssistantProvider>
              </ErrorBoundary>
            </ErrorHandlingProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}