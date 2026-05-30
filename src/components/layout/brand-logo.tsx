"use client";

import Image from "next/image";

import { TREE_LEARNING_LOGO_SRC } from "@/config/brand";
import { resolveSettingsAssetUrl } from "@/lib/settings-assets";
import { cn } from "@/lib/utils";

export { TREE_LEARNING_LOGO_SRC };

/** Light surface in dark theme — logo PNG has a dark matte + dark grey wordmark. */
const logoShell =
  "inline-flex items-center justify-center rounded-lg bg-transparent px-0 py-0 dark:bg-white dark:px-2.5 dark:py-1 dark:shadow-sm dark:ring-1 dark:ring-white/10";

/** Lift wordmark contrast on the white dark-mode shell without washing out greens. */
const logoImgDark =
  "dark:brightness-[1.85] dark:contrast-[1.05] dark:saturate-110";

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
  /** Override logo image URL from site settings. */
  logoSrc?: string;
  alt?: string;
};

function useNativeLogoImg(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  );
}

const imgClass: Record<Exclude<BrandLogoVariant, "login-hero">, string> = {
  header: cn(
    "h-8 w-auto max-w-[min(180px,38vw)] object-contain object-left sm:h-9 md:h-10",
    logoImgDark
  ),
  sheet: cn(
    "h-14 w-auto max-w-[min(280px,calc(100%-1rem))] object-contain object-left sm:h-16",
    logoImgDark
  ),
  "login-form": cn(
    "h-10 w-auto max-w-[200px] object-contain object-left sm:h-11",
    logoImgDark
  ),
};

function LoginHeroMark({
  className,
  logoSrc = TREE_LEARNING_LOGO_SRC,
  alt = "Tree Learning",
}: {
  className?: string;
  logoSrc?: string;
  alt?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-3", className)}
      aria-label={alt}
    >
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/15 shadow-[0_0_20px_rgba(74,222,128,0.4)] ring-1 ring-white/25 sm:h-12 sm:w-12">
        {useNativeLogoImg(logoSrc) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="absolute left-0 top-1/2 h-11 w-auto max-w-none -translate-y-1/2 object-cover object-left sm:h-12"
            style={{ minWidth: "7.5rem" }}
          />
        ) : (
          <Image
            src={logoSrc}
            alt=""
            width={400}
            height={96}
            priority
            className="absolute left-0 top-1/2 h-11 w-auto max-w-none -translate-y-1/2 object-cover object-left sm:h-12"
            style={{ minWidth: "7.5rem" }}
          />
        )}
      </span>
      <span className="text-[1.75rem] font-bold lowercase leading-none tracking-tight text-white sm:text-3xl">
        tree
      </span>
    </span>
  );
}

export function BrandLogo({
  variant,
  className,
  wrapClassName,
  logoSrc,
  alt = "Tree Learning",
}: BrandLogoProps) {
  const rawSrc = logoSrc?.trim() || TREE_LEARNING_LOGO_SRC;
  const src = resolveSettingsAssetUrl(rawSrc);
  const nativeImg = useNativeLogoImg(src);

  if (variant === "login-hero") {
    return (
      <LoginHeroMark
        className={cn(wrapClassName, className)}
        logoSrc={src}
        alt={alt}
      />
    );
  }

  const classNameImg = imgClass[variant];

  return (
    <span className={cn(logoShell, wrapClassName, className)}>
      {nativeImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={classNameImg} />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={400}
          height={96}
          priority
          className={classNameImg}
        />
      )}
    </span>
  );
}
