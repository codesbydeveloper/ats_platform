"use client";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileSidebar />
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-x-hidden p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
