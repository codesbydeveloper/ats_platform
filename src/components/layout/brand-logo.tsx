"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

/** Public asset — horizontal Tree Learning mark (`public/treelearning_logo.png`). */
export const TREE_LEARNING_LOGO_SRC = "/treelearning_logo.png";

/** No fill behind the image so it sits cleanly on the sidebar / login surfaces. */
const baseWrap =
  "inline-flex items-center justify-center bg-transparent px-0 py-0";

type BrandLogoVariant =
  | "header"
  | "sheet"
  | "login-hero"
  | "login-form";

type BrandLogoProps = {
  variant: BrandLogoVariant;
  className?: string;
  /** Extra classes on the outer wrapper (e.g. shrink-0). */
  wrapClassName?: string;
};

const imgClass: Record<Exclude<BrandLogoVariant, "login-hero">, string> = {
  header:
    "h-8 w-auto max-w-[min(180px,38vw)] object-contain object-left sm:h-9 md:h-10",
  sheet:
    "h-14 w-auto max-w-[min(280px,calc(100%-1rem))] object-contain object-left sm:h-16",
  "login-form":
    "h-10 w-auto max-w-[200px] object-contain object-left sm:h-11",
};

function LoginHeroMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="Tree Learning"
    >
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/15 shadow-[0_0_20px_rgba(74,222,128,0.4)] ring-1 ring-white/25 sm:h-12 sm:w-12">
        <Image
          src={TREE_LEARNING_LOGO_SRC}
          alt=""
          width={400}
          height={96}
          priority
          className="absolute left-0 top-1/2 h-11 w-auto max-w-none -translate-y-1/2 object-cover object-left sm:h-12"
          style={{ minWidth: "7.5rem" }}
        />
      </span>
      <span className="text-[1.75rem] font-bold lowercase leading-none tracking-tight text-white sm:text-3xl">
        tree
      </span>
    </span>
  );
}

export function BrandLogo({ variant, className, wrapClassName }: BrandLogoProps) {
  if (variant === "login-hero") {
    return <LoginHeroMark className={cn(wrapClassName, className)} />;
  }

  return (
    <span className={cn(baseWrap, wrapClassName, className)}>
      <Image
        src={TREE_LEARNING_LOGO_SRC}
        alt="Tree Learning"
        width={400}
        height={96}
        priority
        className={imgClass[variant]}
      />
    </span>
  );
}
