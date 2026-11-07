// POST /api/spotify/playlist-order -- verplaatst ÉÉN track in een werkbak naar een andere plek, vanuit het
// trackregister (slepen in TrackRegister.tsx). ALTIJD LOKAAL EERST (Dave, 5 november 2026): de verplaatsing
// wordt toegepast op de uitgestelde volgorde (pendingOrderStore.ts) en er gaat NIETS naar Spotify; de knop
// Push (PendingOrderButton, ./sync/route.ts) stuurt later alles in één keer. Reden: veel minder Spotify-calls
// (rate limit) en sneller slepen. Vroeger kostte elke sleepbeweging een snapshot_id-GET, het volledig ophalen
// van alle items, de reorder-PUT en een refresh; nu kost hij een schrijfactie op schijf, en heen en weer
// slepen kost niets. Zo is er ook maar één schrijfpad: het directe pad naar Spotify en de regel tegen het
// mengen van directe schrijfacties met een wachtrij zijn vervallen. De rate limit doet er hier niet meer toe;
// alleen Push weigert zolang hij loopt.
//
// Body: { playlistId, rangeStart, insertBefore, snapshotId, targetPosition, expectedStartId, expectedTargetId }
//   -- de plekken zoals de pagina ze kent (planPlaylistMove in library/playlistOrder.ts), het snapshot_id
//   waarop de pagina is gebouwd en de Spotify-track-ID's die de pagina op beide plekken verwacht.
//   -> { pending: true, moveCount, rateLimitedUntil } (rateLimitedUntil is alleen informatie voor de knop)
//
// DELETE { playlistId } gooit de uitgestelde volgorde weg; de push staat in ./sync/route.ts.
//
// NOOIT VERPLAATSEN OP VEROUDERDE PLEKKEN. Twee controles vooraf, zonder Spotify:
//   1. het snapshot_id van de pagina moet gelijk zijn aan dat in de lokale snapshot (anders is er intussen
//      gesynchroniseerd, bv. in een ander tabblad) -> 409 `playlist_changed`;
//   2. de verwachte track-ID's moeten op de begin- en de doelplek van de GETOONDE (uitgestelde) volgorde
//      staan en de plekken moeten binnen de lengte vallen -> 409 `playlist_changed`.
// Een Fetch of volledige sync herbaseert de uitgestelde volgorde op de nieuwe snapshot (pendingOrderRebase.ts),
// dus de pagina na zo'n sync klopt weer met de opslag. Hoort de uitgestelde volgorde toch bij een andere
// snapshot dan de opgeslagen (een oude vermelding van vóór het herbaseren), dan 409 `pending_conflict`.
// Per playlist loopt er maar één verplaatsing tegelijk (429 `move_busy`), zodat twee tabbladen elkaars
// lezen-en-schrijven van het bestand niet overschrijven.
//
// Alleen werkbakken (isPreparationPlaylist): meer schrijft de hub niet.
import { NextResponse } from "next/server";
import { sameOriginGuard } from "@/lib/http/sameOrigin";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { tryLockPlaylist, unlockPlaylist } from "@/lib/library/moveLock";
import { applyMove, identityOrder, isPermutation, permuteBy } from "@/lib/library/pendingOrder";
import { deletePendingOrder, getPendingOrder, setPendingOrder, type PendingOrder } from "@/lib/spotify/pendingOrderStore";
import { getRateLimitUntil } from "@/lib/spotify/rateLimitStore";
import type { Playlist } from "@/lib/spotify/types";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;
const isIndex = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

const changed = () =>
  NextResponse.json(
    { error: "playlist_changed", message: "De lijst op deze pagina is verouderd. Ververs de pagina en sleep opnieuw." },
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
  move: { rangeStart: number; insertBefore: number; targetPosition: number; expectedStartId: string; expectedTargetId: string }
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
  return NextResponse.json({ pending: true, moveCount, rateLimitedUntil: getRateLimitUntil() });
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
    const pending = getPendingOrder(playlistId);
    if (pending && pending.baseSnapshotId !== stored.snapshotId) return pendingConflict();
    return queueMove(stored, pending, { rangeStart, insertBefore, targetPosition, expectedStartId, expectedTargetId });
  } catch (err) {
    console.error("[api/spotify/playlist-order] lokaal bewaren mislukt:", err);
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
