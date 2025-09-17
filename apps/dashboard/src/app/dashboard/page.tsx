"use client";

import React from 'react';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsOverview, DetailedStats } from '@/components/dashboard/StatsOverview';
import { JobManagement } from '@/components/dashboard/JobManagement';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions, RecentActions } from '@/components/dashboard/QuickActions';

function DashboardContent() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <StatsOverview />

        {/* Quick Actions and Recent Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActions />
          <RecentActions />
        </div>

        {/* Detailed Stats */}
        <DetailedStats />

        {/* Job Management and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JobManagement />
          <ActivityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}