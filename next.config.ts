import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, too small for a real CSV/XLSX export. Set
      // comfortably above the app-level MAX_IMPORT_FILE_SIZE_BYTES
      // (5 MB, in features/imports/parse.ts) so that check — which
      // gives a friendly, specific error — is always what a person
      // hits first, not this framework-level cutoff.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
