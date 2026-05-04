import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@stadi/db", "@stadi/runtime", "@stadi/shared"],
};

export default config;
