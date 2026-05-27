import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Required for correct routing on Vercel (do not use `output: "export"`). */
  trailingSlash: false,
};

export default nextConfig;
