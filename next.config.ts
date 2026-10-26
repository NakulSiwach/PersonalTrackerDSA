import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tests build into their own folder so they can run while `npm run dev` is using .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
