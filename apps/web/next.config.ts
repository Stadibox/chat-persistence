import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: ["@stadi/db", "@stadi/github-sync", "@stadi/runtime", "@stadi/shared"],
  // Workspace packages use TS source with explicit .js import extensions
  // (NodeNext-style ESM). Webpack needs to map .js -> .ts to resolve them.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default config;
