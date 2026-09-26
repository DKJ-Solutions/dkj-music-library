// Kale API-route voor de wereld-override-laag (worldStore.ts). Zelfde opzet als
// api/spotify/done/route.ts.
//
// GET  -> alle bekende wereld-overrides ({ [playlistId]: { world, updatedAt } }).
// POST -> { playlistId: string; world: SpotifyWorld | null } zet de wereld van één playlist, of
//         wist 'm weer (world: null -- terug naar de auto-classificatie, zie classifyWorld.ts).
//
// fs vereist de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { SPOTIFY_WORLDS, type SpotifyWorld } from "@/lib/spotify/classifyWorld";
import { clearWorldOverride, readWorldOverrides, setWorldOverride } from "@/lib/spotify/worldStore";
import { isValidPlaylistId } from "@/lib/spotify/overrideSafety";
import { sameOriginGuard } from "@/lib/http/sameOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSpotifyWorld(value: unknown): value is SpotifyWorld {
  return typeof value === "string" && (SPOTIFY_WORLDS as readonly string[]).includes(value);
}

export async function GET() {
  return NextResponse.json(readWorldOverrides());
}

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as Record<string, unknown>).playlistId !== "string") {
    return NextResponse.json(
      { error: "invalid_body", message: "Verwacht { playlistId: string; world: 'mmc' | 'djcylow' | 'prive' | null }" },
      { status: 400 }
    );
  }

  const { playlistId, world } = body as { playlistId: string; world: unknown };

  // Vorm-check op de playlist-id zelf -- consistent met dezelfde check op api/spotify/bpm/route.ts
  // (zie overrideSafety.ts voor de aanleiding en de exacte vorm-eis).
  if (!isValidPlaylistId(playlistId)) {
    return NextResponse.json(
      { error: "invalid_body", message: "playlistId heeft niet de vorm van een geldige Spotify-playlist-id" },
      { status: 400 }
    );
  }

  if (world === null) {
    clearWorldOverride(playlistId);
    return NextResponse.json({ playlistId, world: null });
  }

  if (!isSpotifyWorld(world)) {
    return NextResponse.json(
      { error: "invalid_body", message: "world moet 'mmc', 'djcylow', 'prive' of null zijn" },
      { status: 400 }
    );
  }

  setWorldOverride(playlistId, world);
  return NextResponse.json({ playlistId, world });
}
