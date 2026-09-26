import type { NextConfig } from "next";
import path from "path";

// Bewust GEEN `output: 'export'` en GEEN deploy-config (netlify.toml e.d.) — deze app is
// lokaal-only. `npm run dev` (en desnoods `npm run build`/`npm run start`) volstaan; er is
// geen productie-hosting-doel.
const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: [path.join(__dirname, "src/styles")],
  },
  // De Spotify-redirect-URI (en dus de dev-flow) draait op 127.0.0.1, niet localhost (Spotify
  // weigert localhost sinds 2025 -- zie config.ts). Zonder dit staat Next.js 127.0.0.1 wel toe,
  // maar toont bij elke dev-request een cross-origin-waarschuwing.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
