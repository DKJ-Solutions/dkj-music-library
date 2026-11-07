// POST /api/local/link -- koppelt een lokaal bestand zelf aan een track (dkj_local_file), of maakt dat los,
// vanaf /compare/pc-spotify (#151, PcSpotifyLinks.tsx).
// Schrijft in de bibliotheek via withLibrary(), dus de export in data/library/export/ is meteen bij;
// commit die map om de koppeling op je andere machines te hebben. Naar Spotify gaat niets.
//
// Body: { trackId: string; localFile: string | null }  ->  { trackId, localFile } zoals opgeslagen.
//
// fs en node:sqlite vereisen de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { withLibrary } from "@/lib/library/libraryFile";
import { setTrackLocalFile } from "@/lib/local/localLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { trackId, localFile } = (typeof body === "object" && body !== null ? body : {}) as {
    trackId?: unknown;
    localFile?: unknown;
  };
  if (typeof trackId !== "string" || trackId === "" || (typeof localFile !== "string" && localFile !== null)) {
    return NextResponse.json(
      { error: "invalid_body", message: "Verwacht { trackId: string; localFile: string | null }" },
      { status: 400 }
    );
  }

  try {
    const stored = withLibrary((db) => setTrackLocalFile(db, trackId, localFile));
    if (stored === undefined) {
      return NextResponse.json(
        { error: "unknown_track", message: `Track ${trackId} staat niet in de bibliotheek.` },
        { status: 404 }
      );
    }
    return NextResponse.json({ trackId, localFile: stored });
  } catch (err) {
    console.error("[local/link] opslaan mislukt:", err);
    return NextResponse.json(
      { error: "save_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
