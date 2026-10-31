// POST /api/spotify/playlist-order -- verplaatst ÉÉN track in een werkbak naar een andere plek, vanuit het
// trackregister (slepen in TrackRegister.tsx). Spotify is de enige bron van de volgorde: dit stuurt de
// verplaatsing door (reorderPlaylistItem) en haalt de playlist daarna opnieuw op in de snapshot, zodat
// plekken en snapshot_id weer kloppen.
//
// Body: { playlistId, rangeStart, insertBefore, snapshotId, targetPosition, expectedStartId, expectedTargetId }
//   -- de plekken zoals de pagina ze kent (planPlaylistMove in library/playlistOrder.ts), het snapshot_id
//   waarop de pagina is gebouwd en de Spotify-track-ID's die de pagina op beide plekken verwacht.
//   -> { snapshotId (of null), refreshed }
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
// Alleen werkbakken (isPreparationPlaylist): meer schrijft de hub niet.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { SpotifyApiError, SpotifyReauthRequiredError } from "@/lib/spotify/errors";
import { matchesLivePlaylist } from "@/lib/library/playlistOrder";
import { fetchAllPlaylistItems } from "@/lib/spotify/ingest";
import { spotifyGet } from "@/lib/spotify/httpClient";
import { reorderPlaylistItem } from "@/lib/spotify/playlistApi";
import { refreshPlaylistInSnapshot } from "@/lib/spotify/refreshPlaylist";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;
const isIndex = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

// Playlists met een verplaatsing onderweg (in dit proces: de app draait als één lokale server).
const inFlight = new Set<string>();

const changed = () =>
  NextResponse.json(
    { error: "playlist_changed", message: "De playlist was in Spotify gewijzigd. De lijst is bijgewerkt; sleep opnieuw." },
    { status: 409 }
  );

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

  if (inFlight.has(playlistId)) {
    return NextResponse.json({ error: "move_busy", message: "Er loopt al een verplaatsing in deze playlist." }, { status: 429 });
  }
  inFlight.add(playlistId);
  try {
    const current = await spotifyGet<{ snapshot_id?: string }>(`/playlists/${encodeURIComponent(playlistId)}`, {
      fields: "snapshot_id",
    });
    const live = (await fetchAllPlaylistItems(playlistId)).map((item) => item.track?.id ?? null);
    if (
      current.snapshot_id !== snapshotId ||
      !matchesLivePlaylist(live, { rangeStart, insertBefore, targetPosition, expectedStartId, expectedTargetId })
    ) {
      await refreshPlaylistInSnapshot(playlistId);
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
    inFlight.delete(playlistId);
  }
}
