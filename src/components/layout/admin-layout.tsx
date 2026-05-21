"use client";

import { AppBrandHeader } from "@/components/layout/app-brand-header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileSidebar />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <AppBrandHeader />
        <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
          <Sidebar />
          <main className="app-surface min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
