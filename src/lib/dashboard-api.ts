import type { ActivityItem } from "@/components/dashboard/activity-feed";
import { mapApiRowToTeacher } from "@/lib/teachers-api";
import type { DashboardData, DashboardStat } from "@/types/dashboard";
import type { Teacher } from "@/types/teacher";

import { getApiBase } from "@/lib/api-config";

const API_BASE = getApiBase();

function authHeaders(accessToken: string | null): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken) {
    h.Authorization = `Bearer ${accessToken}`;
  }
  return h;
}

function apiErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return `Request failed (${status})`;
  }
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string") return d.message;
  if (Array.isArray(d.message)) return d.message.map(String).join(", ");
  if (typeof d.error === "string") return d.error;
  if (typeof d.detail === "string") return d.detail;
  return `Request failed (${status})`;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function pickStr(r: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNum(r: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

function unwrapDashboardRoot(data: unknown): Record<string, unknown> {
  const root = asRecord(data);
  if (!root) return {};
  const inner = root.data ?? root.dashboard ?? root.result;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root;
}

const STAT_DEFS: {
  keys: string[];
  title: string;
  hint?: string;
  statKey: string;
  trendKeys?: string[];
}[] = [
  {
    keys: ["total_teachers", "totalTeachers", "total", "teachers_count"],
    title: "Total teachers",
    hint: "Across all statuses",
    statKey: "total_teachers",
    trendKeys: ["total_teachers_change_label", "total_teachers_change_percent"],
  },
  {
    keys: ["active_teachers", "activeTeachers", "active", "active_count"],
    title: "Active teachers",
    hint: "Ready for placement",
    statKey: "active_teachers",
  },
  {
    keys: [
      "unique_subjects",
      "uniqueSubjects",
      "subjects_count",
      "subjectsCount",
    ],
    title: "Unique subjects",
    hint: "Coverage breadth",
    statKey: "unique_subjects",
  },
  {
    keys: [
      "resumes_on_file",
      "resumesOnFile",
      "resumes",
      "resumes_count",
      "resumesCount",
    ],
    title: "Resumes on file",
    hint: "PDF / DOC uploads",
    statKey: "resumes_on_file",
  },
];

function parseStatsFromBlock(block: Record<string, unknown>): DashboardStat[] {
  const stats: DashboardStat[] = [];

  for (const def of STAT_DEFS) {
    let value: number | undefined;
    for (const k of def.keys) {
      const n = pickNum(block, k);
      if (n != null) {
        value = n;
        break;
      }
    }
    if (value == null) continue;

    const stat: DashboardStat = {
      key: def.statKey,
      title: def.title,
      value,
    };
    if (def.hint) stat.hint = def.hint;

    if (def.trendKeys) {
      const label = def.trendKeys
        .map((k) => pickStr(block, k))
        .find(Boolean);
      if (label) {
        stat.trend = label;
      } else {
        const pct = pickNum(block, "total_teachers_change_percent");
        if (pct != null) {
          stat.trend = `${pct >= 0 ? "+" : ""}${pct}% vs last cycle`;
        }
      }
    }

    stats.push(stat);
  }

  return stats;
}

function parseStatsArray(raw: unknown[]): DashboardStat[] {
  const stats: DashboardStat[] = [];
  raw.forEach((item, index) => {
    const r = asRecord(item);
    if (!r) return;
    const value = pickNum(r, "value", "count", "total") ?? pickStr(r, "value");
    if (value == null) return;
    const stat: DashboardStat = {
      key: String(r.key ?? r.id ?? r.slug ?? index),
      title: pickStr(r, "title", "label", "name") ?? "Stat",
      value,
    };
    const hint = pickStr(r, "hint", "description", "subtitle");
    const trend = pickStr(r, "trend", "change", "delta", "change_label");
    if (hint) stat.hint = hint;
    if (trend) stat.trend = trend;
    stats.push(stat);
  });
  return stats;
}

function parseStats(root: Record<string, unknown>): DashboardStat[] {
  const statsNode = root.stats ?? root.metrics ?? root.cards ?? root.kpis;

  if (Array.isArray(statsNode) && statsNode.length > 0) {
    return parseStatsArray(statsNode);
  }

  const statsBlock = asRecord(statsNode);
  if (statsBlock) {
    const fromNested = parseStatsFromBlock(statsBlock);
    if (fromNested.length > 0) return fromNested;
  }

  return parseStatsFromBlock(root);
}

function parseActivityType(raw: unknown): ActivityItem["type"] {
  const t = String(raw ?? "").toLowerCase();
  if (t.includes("resume") || t.includes("file")) return "resume";
  if (t.includes("hire") || t.includes("add")) return "hire";
  if (t.includes("review") || t.includes("interview")) return "review";
  if (t.includes("pool")) return "pool";
  return "review";
}

function inferActivityTypeFromMessage(message: string): ActivityItem["type"] {
  const m = message.toLowerCase();
  if (m.includes("resume")) return "resume";
  if (m.includes("interview")) return "review";
  if (m.includes("added") || m.includes("hire")) return "hire";
  return "review";
}

function parseActivity(root: Record<string, unknown>): ActivityItem[] {
  const raw =
    root.activity_logs ??
    root.activityLogs ??
    root.activity ??
    root.activities ??
    root.logs ??
    root.recent_activity;
  if (!Array.isArray(raw)) return [];

  const items: ActivityItem[] = [];
  raw.forEach((item, index) => {
    const r = asRecord(item);
    if (!r) return;
    const title =
      pickStr(r, "message", "title", "description", "text", "action") ??
      "Activity";
    const time =
      pickStr(r, "time_label", "timeLabel") ??
      (() => {
        const rawTime = r.time ?? r.created_at ?? r.createdAt ?? r.timestamp;
        if (rawTime == null) return "";
        const d = new Date(String(rawTime));
        return Number.isNaN(d.getTime()) ? String(rawTime) : d.toLocaleString();
      })();

    items.push({
      id: String(r.id ?? `activity-${index}`),
      title,
      time,
      type:
        r.type != null || r.kind != null || r.category != null
          ? parseActivityType(r.type ?? r.kind ?? r.category)
          : inferActivityTypeFromMessage(title),
    });
  });
  return items;
}

function parseRecentTeachers(root: Record<string, unknown>): Teacher[] {
  const raw =
    root.recent_teachers ??
    root.recentTeachers ??
    root.recent ??
    root.latest_teachers ??
    root.latestTeachers;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((row) => mapApiRowToTeacher(row))
    .filter((t): t is Teacher => t != null);
}

export function normalizeDashboardResponse(data: unknown): DashboardData {
  const root = unwrapDashboardRoot(data);
  return {
    stats: parseStats(root),
    recentTeachers: parseRecentTeachers(root),
    activity: parseActivity(root),
  };
}

export type GetDashboardResult =
  | { ok: true; dashboard: DashboardData }
  | { ok: false; message: string };

/** GET /api/dashboard */
export async function getDashboardRequest(
  accessToken: string | null
): Promise<GetDashboardResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/dashboard`, {
      headers: authHeaders(accessToken),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      message: `Could not reach API at ${API_BASE}. Is the server running?`,
    };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    return { ok: false, message: apiErrorMessage(data, res.status) };
  }

  return { ok: true, dashboard: normalizeDashboardResponse(data) };
}
