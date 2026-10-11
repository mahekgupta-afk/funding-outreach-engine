import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This dashboard always reads live Supabase state (drafts, thesis, runs) and must
  // never serve a stale cached page, so the newer cacheComponents model (which the
  // scaffold enables by default and which conflicts with `dynamic = "force-dynamic"`)
  // is turned off in favor of standard per-page dynamic rendering.
  agentRules: false,
};

export default nextConfig;
