// Fase 4: kale API-route voor de done-status-laag (doneStore.ts). Bewust minimaal -- de echte
// UI (aan/uit-schakelaars, gegroepeerd overzicht) is fase 5's werk, niet dit bestand.
//
// GET  -> alle bekende done-statussen ({ [playlistId]: { done, updatedAt } }).
// POST -> { playlistId: string; done: boolean } zet de status van één playlist.
//
// fs vereist de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { readDoneStatuses, setDoneStatus } from "@/lib/spotify/doneStore";
import { isValidPlaylistId } from "@/lib/spotify/overrideSafety";
import { sameOriginGuard } from "@/lib/http/sameOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readDoneStatuses());
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

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).playlistId !== "string" ||
    typeof (body as Record<string, unknown>).done !== "boolean"
  ) {
    return NextResponse.json(
      { error: "invalid_body", message: "Verwacht { playlistId: string; done: boolean }" },
      { status: 400 }
    );
  }

  const { playlistId, done } = body as { playlistId: string; done: boolean };

  // Vorm-check op de playlist-id zelf -- consistent met dezelfde check op
  // api/spotify/bpm|world/route.ts (zie overrideSafety.ts voor de aanleiding en de exacte vorm-eis).
  if (!isValidPlaylistId(playlistId)) {
    return NextResponse.json(
      { error: "invalid_body", message: "playlistId heeft niet de vorm van een geldige Spotify-playlist-id" },
      { status: 400 }
    );
  }

  setDoneStatus(playlistId, done);
  return NextResponse.json({ playlistId, done });
}
