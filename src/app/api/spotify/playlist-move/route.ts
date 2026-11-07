// POST /api/spotify/playlist-move -- verplaatst één track van de ene werkbak naar een andere (Dave, #134): een
// nummer kan top zijn en toch niet bij de rest van de werkbak passen, en dan wil je hem verhuizen in plaats van
// weggooien.
//
// Body: { fromId, toId, trackId }  ->  { moved: true, added, refreshed }
//
// Stappen: (1) beide moeten werkbakken in de snapshot zijn, verschillend, en de track moet in `fromId` staan;
// (2) weiger zolang de rate limit loopt (503 `rate_limited`); (3) EERST toevoegen aan `toId` (onderaan), DAN
// pas weghalen uit `fromId`. Die volgorde is het hele punt: mislukt de tweede stap, dan staat de track in beide
// werkbakken in plaats van in geen van beide. Staat hij al in `toId`, dan wordt hij daar niet nog eens
// toegevoegd (`added: false`). Spotify haalt bij het weghalen elk exemplaar uit `fromId`, ook een dubbel.
// (4) haal beide playlists opnieuw op in de snapshot; een uitgestelde volgorde verhuist daarbij mee
// (refreshPlaylistInSnapshot -> pendingOrderRebase.ts: de track valt uit de ene weg en komt onderaan de andere).
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { tryLockPlaylist, unlockPlaylist } from "@/lib/library/moveLock";
import { formatClock } from "@/lib/library/pendingOrder";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { SpotifyApiError, SpotifyRateLimitError, SpotifyReauthRequiredError } from "@/lib/spotify/errors";
import { addPlaylistItems, removePlaylistItems } from "@/lib/spotify/playlistApi";
import { getRateLimitUntil } from "@/lib/spotify/rateLimitStore";
import { refreshPlaylistInSnapshot } from "@/lib/spotify/refreshPlaylist";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

const rateLimited = (until: number) =>
  NextResponse.json(
    {
      error: "rate_limited",
      message: `Spotify laat de hub nog niet schrijven (rate limit): probeer het na ${formatClock(until)} opnieuw.`,
      rateLimitedUntil: until,
    },
    { status: 503 }
  );

const fail = (status: number, error: string, message: string) => NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  const body = (await request.json().catch(() => null)) as { fromId?: unknown; toId?: unknown; trackId?: unknown } | null;
  const fromId = typeof body?.fromId === "string" ? body.fromId : "";
  const toId = typeof body?.toId === "string" ? body.toId : "";
  const trackId = typeof body?.trackId === "string" ? body.trackId : "";
  if (!SPOTIFY_ID.test(fromId) || !SPOTIFY_ID.test(toId) || !SPOTIFY_ID.test(trackId)) {
    return fail(400, "bad_request", "Geen geldig playlist- of track-id.");
  }
  if (fromId === toId) return fail(400, "same_playlist", "Kies een andere werkbak dan deze.");

  const playlists = readSnapshot()?.playlists ?? [];
  const from = playlists.find((p) => p.id === fromId);
  const to = playlists.find((p) => p.id === toId);
  if (!from || !to || !isPreparationPlaylist(from.name) || !isPreparationPlaylist(to.name)) {
    return fail(404, "unknown_playlist", "Beide playlists moeten werkbakken in de snapshot zijn.");
  }
  if (!from.tracks.some((item) => item.track?.id === trackId)) {
    return fail(409, "not_in_playlist", "Deze track staat volgens de snapshot niet (meer) in deze werkbak: klik eerst op Fetch.");
  }
  const alreadyThere = to.tracks.some((item) => item.track?.id === trackId);

  const banUntil = getRateLimitUntil();
  if (banUntil) return rateLimited(banUntil);

  if (!tryLockPlaylist(fromId)) return fail(429, "move_busy", "Er loopt al een verplaatsing in deze werkbak.");
  if (!tryLockPlaylist(toId)) {
    unlockPlaylist(fromId);
    return fail(429, "move_busy", "Er loopt al een verplaatsing in de doelwerkbak.");
  }
  let added = false;
  try {
    if (!alreadyThere) {
      await addPlaylistItems(toId, [trackId]);
      added = true;
    }
    await removePlaylistItems(fromId, [trackId], from.snapshotId || null);

    let refreshed = true;
    for (const id of [fromId, toId]) {
      try {
        await refreshPlaylistInSnapshot(id);
      } catch (err) {
        refreshed = false;
        console.error(`[api/spotify/playlist-move] ophalen van ${id} na verplaatsen mislukt:`, err);
      }
    }
    return NextResponse.json({ moved: true, added, refreshed });
  } catch (err) {
    // Is de track al toegevoegd maar niet weggehaald, dan zegt de melding dat hij nu in beide staat.
    const half = added ? " De track staat nu in beide werkbakken; haal hem in Spotify uit de oude of probeer het opnieuw." : "";
    if (err instanceof SpotifyRateLimitError) {
      const until = getRateLimitUntil() ?? Date.now() + err.retryAfterSeconds * 1000;
      return NextResponse.json(
        {
          error: "rate_limited",
          message: `Spotify laat de hub nog niet schrijven (rate limit): probeer het na ${formatClock(until)} opnieuw.${half}`,
          rateLimitedUntil: until,
        },
        { status: 503 }
      );
    }
    if (err instanceof SpotifyReauthRequiredError) return fail(401, "reauth_required", err.message);
    if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 404)) {
      return fail(403, "not_available", `Spotify staat het wijzigen van deze werkbak niet toe.${half}`);
    }
    console.error("[api/spotify/playlist-move] verplaatsen mislukt:", err);
    return fail(500, "move_failed", `Verplaatsen mislukt. Zie de serverconsole voor details.${half}`);
  } finally {
    unlockPlaylist(toId);
    unlockPlaylist(fromId);
  }
}
