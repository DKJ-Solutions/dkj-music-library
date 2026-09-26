import path from "path";
import { defineConfig } from "vitest/config";

// Opzet voor de app-laag (src/). Standaard environment "node": het merendeel van het
// testterrein is pure parseer-logica zonder DOM. Componenttests voor src/components/spotify/*
// zetten hun eigen environment naar "jsdom" via een per-bestand `// @vitest-environment jsdom`
// docblock — de node-standaard voor src/lib/*.test.ts blijft daardoor onaangeroerd.
export default defineConfig({
  resolve: {
    alias: {
      // Zelfde alias als tsconfig.json ("@/*" -> "./src/*"), nodig omdat componenten via
      // "@/lib/spotify/..." / "@/lib/mixes/..." importeren.
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
