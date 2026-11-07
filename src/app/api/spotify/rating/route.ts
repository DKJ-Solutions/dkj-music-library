// POST /api/spotify/rating -- zet dkj_rating of dkj_mix_rating van één track, vanuit het trackregister
// (Rating in TrackRegister.tsx).
// Schrijft in de bibliotheek via withLibrary(), dus de export in data/library/export/ is meteen bij;
// commit die map om de waardering op je andere machines te hebben. Naar Spotify gaat niets.
//
// Body: { trackId: string; rating: string; field?: "dkj_rating" | "dkj_mix_rating" }
//   -> { trackId, field, rating } met de opgeslagen spelling. Zonder field: dkj_rating.
//
// fs en node:sqlite vereisen de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { withLibrary } from "@/lib/library/libraryFile";
import { RATING_KEY } from "@/lib/library/fields";
import { isRatingKey, setTrackRating } from "@/lib/library/rating";
import { TrackInputError } from "@/lib/library/trackStore";

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

  const { trackId, rating, field = RATING_KEY } = (typeof body === "object" && body !== null ? body : {}) as {
    trackId?: unknown;
    rating?: unknown;
    field?: unknown;
  };
  if (typeof trackId !== "string" || trackId === "" || typeof rating !== "string" || !isRatingKey(field)) {
    return NextResponse.json(
      { error: "invalid_body", message: 'Verwacht { trackId: string; rating: string; field?: "dkj_rating" | "dkj_mix_rating" }' },
      { status: 400 }
    );
  }

  try {
    const stored = withLibrary((db) => setTrackRating(db, trackId, rating, field));
    if (stored === null) {
      return NextResponse.json(
        { error: "unknown_track", message: `Track ${trackId} staat niet in de bibliotheek.` },
        { status: 404 }
      );
    }
    return NextResponse.json({ trackId, field, rating: stored });
  } catch (err) {
    if (err instanceof TrackInputError) {
      return NextResponse.json({ error: "invalid_rating", message: err.message }, { status: 400 });
    }
    console.error("[spotify/rating] opslaan mislukt:", err);
    return NextResponse.json(
      { error: "save_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
