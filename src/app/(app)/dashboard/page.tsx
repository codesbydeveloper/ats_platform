"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FileText, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCardSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDashboardRequest } from "@/lib/dashboard-api";
import { useAuthStore } from "@/store/auth-store";
import type { DashboardData } from "@/types/dashboard";

const STAT_ICONS: Record<string, LucideIcon> = {
  total_teachers: Users,
  resumes_on_file: FileText,
};

function iconForStat(key: string): LucideIcon {
  return STAT_ICONS[key] ?? FileText;
}

const EMPTY_DASHBOARD: DashboardData = {
  stats: [],
  recentTeachers: [],
  activity: [],
};

export default function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void getDashboardRequest(accessToken).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setDashboard(EMPTY_DASHBOARD);
        toast.error("Could not load dashboard", { description: result.message });
        return;
      }
      setDashboard(result.dashboard);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Live metrics across your roster."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const { stats, recentTeachers: recent, activity } = dashboard;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live metrics across your roster."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/teachers">
            Open teachers
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        {stats.map((stat) => (
          <StatsCard
            key={stat.key}
            title={stat.title}
            value={stat.value}
            hint={stat.hint}
            icon={iconForStat(stat.key)}
            trend={stat.trend}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <Card className="flex h-full min-h-0 flex-col border bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent teachers
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 pt-0">
            <ScrollArea className="h-[280px] pr-3">
              <div className="space-y-3">
                {recent.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No recent teachers.
                  </p>
                ) : (
                  recent.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.subject}
                        </p>
                      </div>
                      <Badge variant="secondary">{t.status}</Badge>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <ActivityFeed items={activity} className="h-full min-h-[300px]" />
      </div>
    </div>
  );
}
