// Een verplaatsing in een werkbak opslaan vanuit het trackregister: POST /api/spotify/playlist-order (zie die
// route voor wat de server controleert en doet). Gooit met de uitleg uit het antwoord als het mislukt;
// `changed` is true als Spotify de playlist intussen anders had, zodat de aanroeper de lijst ververst.
//
// Pure module (op fetch na): geen fs, geen React -- vanuit een 'use client'-bestand te gebruiken.
import { readRouteErrorMessage } from "@/lib/http/routeError";
import type { MoveExpectation } from "./playlistOrder";

export class PlaylistOrderError extends Error {
  constructor(message: string, readonly changed: boolean) {
    super(message);
    this.name = "PlaylistOrderError";
  }
}

/** `refreshed` is false als Spotify de verplaatsing deed maar de snapshot niet bijgewerkt kon worden.
 *  `pending` is true als de verplaatsing lokaal is bewaard (uitgestelde volgorde) in plaats van naar Spotify
 *  gegaan; `rateLimitedUntil` is dan het tijdstip (ms) waarop Spotify weer schrijft, of null als er geen
 *  rate limit loopt (er bestond al een uitgestelde volgorde). */
export interface SavedPlaylistOrder {
  refreshed: boolean;
  pending: boolean;
  rateLimitedUntil: number | null;
}

export async function savePlaylistOrder(
  playlistId: string,
  snapshotId: string,
  move: MoveExpectation
): Promise<SavedPlaylistOrder> {
  const res = await fetch("/api/spotify/playlist-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlistId, snapshotId, ...move }),
  });
  if (!res.ok) throw new PlaylistOrderError((await readRouteErrorMessage(res)) ?? `status ${res.status}`, res.status === 409);
  const data = (await res.json()) as { refreshed?: boolean; pending?: boolean; rateLimitedUntil?: number | null };
  return { refreshed: data.refreshed !== false, pending: data.pending === true, rateLimitedUntil: data.rateLimitedUntil ?? null };
}
