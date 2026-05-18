import type { ActivityItem } from "@/components/dashboard/activity-feed";
import type { Teacher } from "@/types/teacher";

export interface DashboardStat {
  key: string;
  title: string;
  value: number | string;
  hint?: string;
  trend?: string;
}

export interface DashboardData {
  stats: DashboardStat[];
  recentTeachers: Teacher[];
  activity: ActivityItem[];
}
