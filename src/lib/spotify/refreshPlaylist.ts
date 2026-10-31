// Eén playlist opnieuw ophalen, in de snapshot zetten en de bibliotheek bijwerken. Gedeeld door de sync van
// één playlist (api/spotify/sync/playlist) en het verplaatsen van een track (api/spotify/playlist-order):
// beide moeten daarna dezelfde stand hebben, met actuele plekken en snapshot_id.
//
// SERVER-ONLY: leest en schrijft de snapshot en de bibliotheek.
import { updateLibraryFromSnapshot } from "@/lib/library/librarySync";
import { syncOnePlaylist } from "./ingest";
import { readSnapshot, writeSnapshot } from "./snapshotStore";
import type { Playlist } from "./types";

/** Gooit als er nog geen snapshot is (NoSnapshotError) of als Spotify de playlist niet geeft. Lukt de
 *  bibliotheek niet, dan staat de snapshot er wél: `libraryUpdated` is dan false. Geen archiefkopie van de
 *  oude snapshot, zie de toelichting in api/spotify/sync/playlist/route.ts. */
export async function refreshPlaylistInSnapshot(
  playlistId: string
): Promise<{ playlist: Playlist; libraryUpdated: boolean }> {
  const previous = readSnapshot();
  if (!previous) throw new NoSnapshotError();
  const { snapshot, playlist } = await syncOnePlaylist(previous, playlistId);
  writeSnapshot(snapshot);

  let libraryUpdated = true;
  try {
    updateLibraryFromSnapshot(snapshot);
  } catch (err) {
    libraryUpdated = false;
    console.error("[spotify/refreshPlaylist] bibliotheek bijwerken mislukt:", err);
  }
  return { playlist, libraryUpdated };
}

export class NoSnapshotError extends Error {
  constructor() {
    super("Er is nog geen snapshot -- start eerst een volledige sync op /spotify.");
    this.name = "NoSnapshotError";
  }
}
