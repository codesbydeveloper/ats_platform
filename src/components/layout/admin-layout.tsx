"use client";

import { AppBrandHeader } from "@/components/layout/app-brand-header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileSidebar />
      <div className="flex min-h-svh w-full flex-col bg-background [--app-header:3.5rem]">
        <AppBrandHeader />
        <div className="flex flex-1 items-start">
          <Sidebar className="sticky top-[var(--app-header)] hidden h-[calc(100svh-var(--app-header))] shrink-0 md:flex md:flex-col" />
          <main className="app-surface min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
