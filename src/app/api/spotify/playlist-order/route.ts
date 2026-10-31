// POST /api/spotify/playlist-order -- verplaatst ÉÉN track in een werkbak naar een andere plek, vanuit het
// trackregister (slepen in TrackRegister.tsx). Spotify is de bron van de volgorde: dit stuurt de
// verplaatsing door (reorderPlaylistItem) en haalt de playlist daarna opnieuw op in de snapshot, zodat
// plekken en snapshot_id weer kloppen. DE ENIGE UITZONDERING is een uitgestelde volgorde (pendingOrderStore.ts)
// zolang Spotify niet te schrijven is, zie "Uitstellen" hieronder.
//
// Body: { playlistId, rangeStart, insertBefore, snapshotId, targetPosition, expectedStartId, expectedTargetId }
//   -- de plekken zoals de pagina ze kent (planPlaylistMove in library/playlistOrder.ts), het snapshot_id
//   waarop de pagina is gebouwd en de Spotify-track-ID's die de pagina op beide plekken verwacht.
//   -> { snapshotId (of null), refreshed }, of bij uitstellen { pending: true, moveCount, rateLimitedUntil }
//
// DELETE { playlistId } gooit de uitgestelde volgorde weg; de sync ernaartoe staat in ./sync/route.ts.
//
// NOOIT VERPLAATSEN OP VEROUDERDE PLEKKEN. Spotify weigert een oud snapshot_id niet maar voert de plekken uit
// op de lijst van dat moment, wat de verkeerde track verplaatst. Daarom drie controles vooraf:
//   1. het snapshot_id van de pagina moet gelijk zijn aan dat in de lokale snapshot (anders is er intussen
//      gesynchroniseerd, bv. in een ander tabblad);
//   2. het moet gelijk zijn aan dat van Spotify nu (één goedkope GET met alleen `snapshot_id`);
//   3. de LIVE items van Spotify moeten op de begin- en de doelplek de verwachte track dragen en de plekken
//      moeten binnen de lengte vallen (matchesLivePlaylist). Dit is de controle die het snapshot_id niet kan
//      vervangen: een snapshot kan een nieuw id dragen bij oude tracks (een mislukte ophaal in een volledige
//      sync deed dat vroeger), en dan zou 1 en 2 slagen op verouderde plekken.
// Bij een verschil antwoordt de route 409 `playlist_changed` nadat hij de playlist opnieuw in de snapshot
// heeft gezet, en verplaatst hij niets. Per playlist loopt er maar één verplaatsing tegelijk (429
// `move_busy`), zodat twee tabbladen niet allebei de controle halen en dan tegen hetzelfde snapshot_id
// schrijven. Tussen controle 3 en de PUT blijft een venster van enkele honderden milliseconden over, buiten
// deze app om; Spotify heeft geen lock.
//
// Een lange rate limit van Spotify (Retry-After boven MAX_RETRY_WAIT_SECONDS in httpClient.ts) wordt niet
// uitgezeten maar meteen gemeld; vóór 31 oktober 2026 sliep de aanvraag dan uren en hield ze het slot hierboven
// vast, zodat elke volgende poging `move_busy` kreeg.
//
// UITSTELLEN (Dave, 31 oktober 2026: "zodat ik hier nog tracks kan verplaatsen"). Is er een uitgestelde
// volgorde voor de playlist, is de rate limit nog actief (rateLimitStore.ts) of gooit Spotify er tijdens deze
// verplaatsing een, dan wordt de verplaatsing lokaal op de uitgestelde volgorde toegepast en antwoordt de
// route 200 met `pending: true`. Bestaat er eenmaal een uitgestelde volgorde, dan gaan ALLE verdere
// verplaatsingen daarheen tot hij verstuurd of weggegooid is: nooit directe schrijfacties vermengen met een
// wachtrij. De verwachte track-ID's gelden dan voor de GETOONDE (uitgestelde) volgorde, niet voor die van
// Spotify. Hoort de uitgestelde volgorde bij een andere snapshot dan de opgeslagen, dan 409 `pending_conflict`.
//
// Alleen werkbakken (isPreparationPlaylist): meer schrijft de hub niet.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { SpotifyApiError, SpotifyRateLimitError, SpotifyReauthRequiredError } from "@/lib/spotify/errors";
import { tryLockPlaylist, unlockPlaylist } from "@/lib/library/moveLock";
import { applyMove, identityOrder, isPermutation, permuteBy } from "@/lib/library/pendingOrder";
import { matchesLivePlaylist } from "@/lib/library/playlistOrder";
import { deletePendingOrder, getPendingOrder, setPendingOrder, type PendingOrder } from "@/lib/spotify/pendingOrderStore";
import { getRateLimitUntil } from "@/lib/spotify/rateLimitStore";
import type { Playlist } from "@/lib/spotify/types";
import { fetchAllPlaylistItems } from "@/lib/spotify/ingest";
import { spotifyGet } from "@/lib/spotify/httpClient";
import { reorderPlaylistItem } from "@/lib/spotify/playlistApi";
import { refreshPlaylistInSnapshot } from "@/lib/spotify/refreshPlaylist";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;
const isIndex = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

const changed = () =>
  NextResponse.json(
    { error: "playlist_changed", message: "De playlist was in Spotify gewijzigd. De lijst is bijgewerkt; sleep opnieuw." },
    { status: 409 }
  );

const pendingConflict = () =>
  NextResponse.json(
    {
      error: "pending_conflict",
      message: "De lokale volgorde hoort bij een oudere stand van de playlist. Gooi hem weg of stuur hem eerst naar Spotify.",
    },
    { status: 409 }
  );

const busy = () =>
  NextResponse.json({ error: "move_busy", message: "Er loopt al een verplaatsing in deze playlist." }, { status: 429 });

/** Past de verplaatsing toe op de uitgestelde volgorde (maakt hem aan vanuit de snapshot als hij nog niet
 *  bestaat). De plekken en verwachte ID's gelden voor de getoonde volgorde: klopt dat niet, dan 409. */
function queueMove(
  stored: Playlist,
  pending: PendingOrder | null,
  move: { rangeStart: number; insertBefore: number; targetPosition: number; expectedStartId: string; expectedTargetId: string },
  rateLimitedUntil: number | null
) {
  const order = pending?.order ?? identityOrder(stored.tracks.length);
  if (!isPermutation(order, stored.tracks.length)) return pendingConflict();
  const shown = permuteBy(stored.tracks, order).map((item) => item.track?.id ?? null);
  if (
    move.targetPosition >= shown.length ||
    shown[move.rangeStart] !== move.expectedStartId ||
    shown[move.targetPosition] !== move.expectedTargetId
  ) {
    return changed();
  }
  const moveCount = (pending?.moveCount ?? 0) + 1;
  setPendingOrder(stored.id, {
    baseSnapshotId: stored.snapshotId,
    order: applyMove(order, move),
    moveCount,
  });
  return NextResponse.json({ pending: true, moveCount, rateLimitedUntil });
}

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { playlistId, rangeStart, insertBefore, snapshotId, targetPosition, expectedStartId, expectedTargetId } = body ?? {};
  if (
    !isIndex(targetPosition) ||
    typeof expectedStartId !== "string" ||
    expectedStartId === "" ||
    typeof expectedTargetId !== "string" ||
    expectedTargetId === "" ||
    typeof playlistId !== "string" ||
    !PLAYLIST_ID.test(playlistId) ||
    !isIndex(rangeStart) ||
    !isIndex(insertBefore) ||
    typeof snapshotId !== "string" ||
    snapshotId === ""
  ) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Verwacht { playlistId, rangeStart, insertBefore, snapshotId, targetPosition, expectedStartId, expectedTargetId }.",
      },
      { status: 400 }
    );
  }

  const stored = readSnapshot()?.playlists.find((p) => p.id === playlistId);
  if (!stored || !isPreparationPlaylist(stored.name)) {
    return NextResponse.json({ error: "unknown_playlist", message: "Dit is geen werkbak in de snapshot." }, { status: 404 });
  }
  if (rangeStart >= stored.tracks.length || insertBefore > stored.tracks.length) {
    return NextResponse.json({ error: "bad_request", message: "Die plek bestaat niet in de playlist." }, { status: 400 });
  }
  if (stored.snapshotId !== snapshotId) return changed();

  if (!tryLockPlaylist(playlistId)) return busy();
  try {
    const queued = { rangeStart, insertBefore, targetPosition, expectedStartId, expectedTargetId };

    // Een bestaande uitgestelde volgorde of een actieve rate limit: niet naar Spotify, maar lokaal.
    const pending = getPendingOrder(playlistId);
    if (pending) {
      if (pending.baseSnapshotId !== stored.snapshotId) return pendingConflict();
      return queueMove(stored, pending, queued, getRateLimitUntil());
    }
    const banUntil = getRateLimitUntil();
    if (banUntil) return queueMove(stored, null, queued, banUntil);

    try {
      const current = await spotifyGet<{ snapshot_id?: string }>(`/playlists/${encodeURIComponent(playlistId)}`, {
        fields: "snapshot_id",
      });
      const live = (await fetchAllPlaylistItems(playlistId)).map((item) => item.track?.id ?? null);
      if (
        current.snapshot_id !== snapshotId ||
        !matchesLivePlaylist(live, { rangeStart, insertBefore, targetPosition, expectedStartId, expectedTargetId })
      ) {
        try {
          await refreshPlaylistInSnapshot(playlistId);
        } catch (err) {
          // Een rate limit hier verandert niets aan de uitkomst: de pagina klopt niet meer.
          if (!(err instanceof SpotifyRateLimitError)) throw err;
        }
        return changed();
      }

      // Vanaf hier is een geslaagde PUT een gedane verplaatsing: wat daarna misgaat is geen mislukte
      // verplaatsing, en de aanroeper rolt er niets voor terug.
      const newSnapshotId = await reorderPlaylistItem(playlistId, { rangeStart, insertBefore, snapshotId });
      try {
        await refreshPlaylistInSnapshot(playlistId);
      } catch (err) {
        console.error("[api/spotify/playlist-order] ophalen na verplaatsen mislukt:", err);
        return NextResponse.json({ snapshotId: newSnapshotId, refreshed: false });
      }
      return NextResponse.json({ snapshotId: newSnapshotId, refreshed: true });
    } catch (err) {
      // Spotify weigert (nog) te schrijven: de verplaatsing wacht lokaal. Niets is naar Spotify gegaan (een
      // 429 wordt niet uitgevoerd), dus de snapshot is nog de stand waarop de pagina is gebouwd.
      if (err instanceof SpotifyRateLimitError) {
        return queueMove(stored, null, queued, getRateLimitUntil() ?? Date.now() + err.retryAfterSeconds * 1000);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof SpotifyReauthRequiredError) {
      return NextResponse.json({ error: "reauth_required", message: err.message }, { status: 401 });
    }
    if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 404)) {
      return NextResponse.json(
        { error: "not_available", message: "Spotify staat het verplaatsen in deze playlist niet toe." },
        { status: 403 }
      );
    }
    console.error("[api/spotify/playlist-order] verplaatsen mislukt:", err);
    return NextResponse.json(
      { error: "move_failed", message: "Verplaatsen mislukt. Zie de serverconsole voor details." },
      { status: 500 }
    );
  } finally {
    unlockPlaylist(playlistId);
  }
}

/** Gooit de uitgestelde volgorde van een werkbak weg: de pagina toont daarna weer de volgorde van Spotify. */
export async function DELETE(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  const body = (await request.json().catch(() => null)) as { playlistId?: unknown } | null;
  const playlistId = typeof body?.playlistId === "string" ? body.playlistId : "";
  if (!PLAYLIST_ID.test(playlistId)) {
    return NextResponse.json({ error: "bad_request", message: "Geen geldig playlist-id." }, { status: 400 });
  }
  if (!tryLockPlaylist(playlistId)) return busy();
  try {
    deletePendingOrder(playlistId);
    return NextResponse.json({ discarded: true });
  } finally {
    unlockPlaylist(playlistId);
  }
}
