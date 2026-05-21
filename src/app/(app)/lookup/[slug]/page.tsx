"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { CategoryOptionsView } from "@/components/lookup/category-options-view";
import { getLookupMenuItem } from "@/config/lookup-menu";
import { Button } from "@/components/ui/button";

export default function LookupCategoryPage() {
  const params = useParams();
  const slug =
    typeof params.slug === "string" ? params.slug : String(params.slug ?? "");
  const menuItem = getLookupMenuItem(slug);

  if (!menuItem) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">Unknown lookup list.</p>
        <Button variant="link" className="px-0" asChild>
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CategoryOptionsView menuItem={menuItem} />
    </div>
  );
}
