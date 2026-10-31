// POST /api/spotify/playlist-order/sync -- stuurt de uitgestelde volgorde van een werkbak (pendingOrderStore.ts,
// opgebouwd door api/spotify/playlist-order terwijl Spotify niet te schrijven was) naar Spotify.
//
// Body: { playlistId }  ->  { synced: true, moves, refreshed }
//
// Stappen: (1) weiger zolang de rate limit loopt (503 `rate_limited`, met `rateLimitedUntil`); (2) haal de
// LIVE items op; (3) hoort de uitgestelde volgorde bij de opgeslagen snapshot en bevat Spotify dezelfde items
// als de gewenste volgorde (planSyncMoves), dan volgen de verplaatsingen van live naar gewenst, één PUT per
// verplaatsing, met het snapshot_id van de vorige PUT; (4) haal de playlist opnieuw op in de snapshot en gooi
// de uitgestelde volgorde weg.
//
// Valt er halverwege een 429, dan blijft de uitgestelde volgorde staan: het gewenste eindbeeld is nog geldig
// en de volgende keer wordt het vanuit de dan LIVE volgorde opnieuw uitgerekend, dus gedane verplaatsingen
// gaan niet dubbel. Verschilt Spotify van de uitgestelde volgorde (tracks toegevoegd of weggehaald, of een
// andere snapshot opgeslagen), dan 409 `pending_conflict` en gebeurt er niets; alleen weggooien
// (DELETE op ../route.ts) helpt dan. Lukt het ophalen na de laatste PUT niet, dan blijft de uitgestelde
// volgorde ook staan (`refreshed: false`): een volgende sync vindt dan niets meer te verplaatsen en ruimt hem op.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { tryLockPlaylist, unlockPlaylist } from "@/lib/library/moveLock";
import { formatClock, isPermutation, permuteBy, planSyncMoves } from "@/lib/library/pendingOrder";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { SpotifyApiError, SpotifyRateLimitError, SpotifyReauthRequiredError } from "@/lib/spotify/errors";
import { spotifyGet } from "@/lib/spotify/httpClient";
import { fetchAllPlaylistItems } from "@/lib/spotify/ingest";
import { deletePendingOrder, getPendingOrder } from "@/lib/spotify/pendingOrderStore";
import { reorderPlaylistItem } from "@/lib/spotify/playlistApi";
import { getRateLimitUntil } from "@/lib/spotify/rateLimitStore";
import { refreshPlaylistInSnapshot } from "@/lib/spotify/refreshPlaylist";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;

const rateLimited = (until: number) =>
  NextResponse.json(
    {
      error: "rate_limited",
      message: `Spotify laat de hub nog niet schrijven (rate limit): probeer het na ${formatClock(until)} opnieuw.`,
      rateLimitedUntil: until,
    },
    { status: 503 }
  );

const conflict = () =>
  NextResponse.json(
    {
      error: "pending_conflict",
      message: "De playlist in Spotify wijkt af van de stand waarop de lokale volgorde is gebouwd (tracks toegevoegd of weggehaald). Gooi de lokale volgorde weg.",
    },
    { status: 409 }
  );

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  const body = (await request.json().catch(() => null)) as { playlistId?: unknown } | null;
  const playlistId = typeof body?.playlistId === "string" ? body.playlistId : "";
  if (!PLAYLIST_ID.test(playlistId)) {
    return NextResponse.json({ error: "bad_request", message: "Geen geldig playlist-id." }, { status: 400 });
  }

  const stored = readSnapshot()?.playlists.find((p) => p.id === playlistId);
  if (!stored || !isPreparationPlaylist(stored.name)) {
    return NextResponse.json({ error: "unknown_playlist", message: "Dit is geen werkbak in de snapshot." }, { status: 404 });
  }
  const pending = getPendingOrder(playlistId);
  if (!pending) {
    return NextResponse.json({ error: "no_pending", message: "Er is geen lokale volgorde om te versturen." }, { status: 404 });
  }
  if (pending.baseSnapshotId !== stored.snapshotId || !isPermutation(pending.order, stored.tracks.length)) return conflict();

  const banUntil = getRateLimitUntil();
  if (banUntil) return rateLimited(banUntil);

  if (!tryLockPlaylist(playlistId)) {
    return NextResponse.json({ error: "move_busy", message: "Er loopt al een verplaatsing in deze playlist." }, { status: 429 });
  }
  try {
    const desired = permuteBy(stored.tracks, pending.order).map((item) => item.track?.id ?? null);
    const snapshotOf = async () =>
      (await spotifyGet<{ snapshot_id?: string }>(`/playlists/${encodeURIComponent(playlistId)}`, { fields: "snapshot_id" }))
        .snapshot_id;
    let snapshotId = await snapshotOf();
    const live = (await fetchAllPlaylistItems(playlistId)).map((item) => item.track?.id ?? null);
    const moves = planSyncMoves(live, desired);
    if (!moves || !snapshotId) return conflict();

    for (const move of moves) {
      // Een PUT zonder snapshot_id in het antwoord is wel geslaagd: dan het actuele id opnieuw vragen.
      snapshotId = (await reorderPlaylistItem(playlistId, { ...move, snapshotId })) ?? (await snapshotOf());
      if (!snapshotId) throw new Error("Spotify gaf geen snapshot_id na een verplaatsing");
    }

    try {
      await refreshPlaylistInSnapshot(playlistId);
    } catch (err) {
      console.error("[api/spotify/playlist-order/sync] ophalen na versturen mislukt:", err);
      return NextResponse.json({ synced: true, moves: moves.length, refreshed: false });
    }
    deletePendingOrder(playlistId);
    return NextResponse.json({ synced: true, moves: moves.length, refreshed: true });
  } catch (err) {
    if (err instanceof SpotifyRateLimitError) {
      return rateLimited(getRateLimitUntil() ?? Date.now() + err.retryAfterSeconds * 1000);
    }
    if (err instanceof SpotifyReauthRequiredError) {
      return NextResponse.json({ error: "reauth_required", message: err.message }, { status: 401 });
    }
    if (err instanceof SpotifyApiError && (err.status === 403 || err.status === 404)) {
      return NextResponse.json(
        { error: "not_available", message: "Spotify staat het verplaatsen in deze playlist niet toe." },
        { status: 403 }
      );
    }
    console.error("[api/spotify/playlist-order/sync] versturen mislukt:", err);
    return NextResponse.json(
      { error: "sync_failed", message: "Versturen mislukt. Zie de serverconsole voor details." },
      { status: 500 }
    );
  } finally {
    unlockPlaylist(playlistId);
  }
}
