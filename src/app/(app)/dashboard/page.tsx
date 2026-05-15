"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FileText, Users } from "lucide-react";

import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCardSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeacherStore } from "@/store/teacher-store";

export default function DashboardPage() {
  const teachers = useTeacherStore((s) => s.teachers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((t) => t.status === "active").length;
    const subjects = new Set(teachers.map((t) => t.subject)).size;
    const resumes = teachers.filter((t) => t.resumeFileName).length;
    return { total, active, subjects, resumes };
  }, [teachers]);

  const activity: ActivityItem[] = useMemo(() => {
    return teachers.slice(0, 6).map((t, i) => ({
      id: t.id,
      title:
        i % 3 === 0
          ? `${t.name} added to active pool`
          : i % 3 === 1
            ? `Resume screened · ${t.subject}`
            : `Interview loop · ${t.city}`,
      time: new Date(t.createdAt).toLocaleString(),
      type: i % 3 === 0 ? "hire" : i % 3 === 1 ? "resume" : "review",
    }));
  }, [teachers]);

  const recent = useMemo(
    () =>
      [...teachers]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [teachers]
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Snapshot of your teacher pipeline."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live metrics across your roster — powered entirely in the browser."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/teachers">
            Open teachers
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total teachers"
          value={stats.total}
          hint="Across all statuses"
          icon={Users}
          trend="+12% vs last cycle (demo)"
        />
        <StatsCard
          title="Active teachers"
          value={stats.active}
          hint="Ready for placement"
          icon={Users}
        />
        <StatsCard
          title="Unique subjects"
          value={stats.subjects}
          hint="Coverage breadth"
          icon={FileText}
        />
        <StatsCard
          title="Resumes on file"
          value={stats.resumes}
          hint="PDF / DOC uploads"
          icon={FileText}
        />
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
                {recent.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.subject}</p>
                    </div>
                    <Badge variant="secondary">{t.status}</Badge>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <ActivityFeed items={activity} className="h-full min-h-[300px]" />
      </div>
    </div>
  );
}
