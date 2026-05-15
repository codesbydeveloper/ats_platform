"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, FileText, UserPlus, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  title: string;
  time: string;
  type: "hire" | "resume" | "pool" | "review";
}

const iconMap = {
  hire: UserPlus,
  resume: FileText,
  pool: Users,
  review: ArrowUpRight,
};

export function ActivityFeed({
  items,
  className,
}: {
  items: ActivityItem[];
  className?: string;
}) {
  return (
    <Card className={cn("border bg-card/80 shadow-sm backdrop-blur", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Activity logs</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px] pr-3">
          <ul className="space-y-3">
            {items.map((item, i) => {
              const Icon = iconMap[item.type];
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex gap-3 rounded-lg border bg-muted/40 p-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
