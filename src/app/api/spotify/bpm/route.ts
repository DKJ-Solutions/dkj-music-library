// Kale API-route voor de BPM-override-laag binnen MMC (bpmStore.ts). Zelfde opzet als
// api/spotify/world/route.ts.
//
// GET  -> alle bekende BPM-overrides ({ [playlistId]: { bpm, updatedAt } }).
// POST -> { playlistId: string; bpm: 96 | 112 | 128 | 176 | null } zet de BPM van één playlist, of
//         wist 'm weer (bpm: null -- terug naar de auto-classificatie, zie classifyBpm.ts).
//
// fs vereist de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { MMC_BPM_TIERS, type MmcBpmTier } from "@/lib/spotify/classifyBpm";
import { clearBpmOverride, readBpmOverrides, setBpmOverride } from "@/lib/spotify/bpmStore";
import { isValidPlaylistId } from "@/lib/spotify/overrideSafety";
import { sameOriginGuard } from "@/lib/http/sameOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMmcBpmTier(value: unknown): value is MmcBpmTier {
  return typeof value === "number" && (MMC_BPM_TIERS as readonly number[]).includes(value);
}

export async function GET() {
  return NextResponse.json(readBpmOverrides());
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
      { error: "invalid_body", message: "Verwacht { playlistId: string; bpm: 96 | 112 | 128 | 176 | null }" },
      { status: 400 }
    );
  }

  const { playlistId, bpm } = body as { playlistId: string; bpm: unknown };

  // Vorm-check op de playlist-id zelf -- vóór zowel het clear- als het set-pad, consistent met de
  // striktheid die al op `bpm` zit. Zie overrideSafety.ts voor de aanleiding (prototype-pollution-
  // randgeval) en de exacte vorm-eis.
  if (!isValidPlaylistId(playlistId)) {
    return NextResponse.json(
      { error: "invalid_body", message: "playlistId heeft niet de vorm van een geldige Spotify-playlist-id" },
      { status: 400 }
    );
  }

  if (bpm === null) {
    clearBpmOverride(playlistId);
    return NextResponse.json({ playlistId, bpm: null });
  }

  if (!isMmcBpmTier(bpm)) {
    return NextResponse.json(
      { error: "invalid_body", message: "bpm moet 96, 112, 128, 176 of null zijn" },
      { status: 400 }
    );
  }

  setBpmOverride(playlistId, bpm);
  return NextResponse.json({ playlistId, bpm });
}
