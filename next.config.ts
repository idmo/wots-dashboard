import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone/ output (server + only the
  // node_modules it actually needs) instead of requiring a full npm install
  // on every host. The Dockerfile's "runner" stage copies just that output,
  // which is what keeps the deployed image small.
  output: "standalone",
};

export default nextConfig;
