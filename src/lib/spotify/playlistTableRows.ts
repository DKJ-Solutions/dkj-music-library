// De rijen van de playlist-tabel (playlistTable.ts), uit een playlist in de snapshot. Apart van
// playlistTable.ts omdat yearOf() in releaseYears.ts woont, dat de database importeert: dit bestand
// hoort alleen aan de serverkant.
import { yearOf } from "@/lib/library/releaseYears";
import type { PlaylistTableRow } from "./playlistTable";
import type { Playlist, Snapshot } from "./types";

/** Spotify user-id -> weergavenaam, uit de eigenaren van alle playlists in de snapshot. De items van een
 *  playlist geven alleen een user-id (`addedBy`); wie in een gedeelde playlist nummers toevoegt, heeft
 *  meestal zelf ook een playlist in de snapshot, dus zo komt de naam er zonder extra API-aanroep bij. */
export function userNamesFromSnapshot(snapshot: Snapshot): Map<string, string> {
  const names = new Map<string, string>();
  for (const playlist of snapshot.playlists) {
    if (playlist.owner.displayName) names.set(playlist.owner.id, playlist.owner.displayName);
  }
  return names;
}

/** Eén rij per nummer, in de volgorde van de playlist. Een item zonder track (een lokaal bestand zonder
 *  metadata, een podcast-aflevering) valt weg, maar telt wel mee in de positie, zodat die met Spotify
 *  blijft kloppen. Een toevoeger die niet in `userNames` staat, blijft als user-id staan. */
export function toPlaylistTableRows(
  playlist: Playlist,
  userNames: ReadonlyMap<string, string> = new Map()
): PlaylistTableRow[] {
  return playlist.tracks.flatMap((item, index) =>
    item.track
      ? [
          {
            position: index + 1,
            trackId: item.track.id,
            title: item.track.name,
            artists: item.track.artists.map((artist) => artist.name),
            album: item.track.album.name,
            year: yearOf(item.track.album.releaseDate),
            durationMs: item.track.durationMs,
            addedAt: item.addedAt,
            addedBy: item.addedBy ? (userNames.get(item.addedBy) ?? item.addedBy) : null,
          },
        ]
      : []
  );
}
