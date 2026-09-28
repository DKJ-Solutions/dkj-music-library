// De rijen van de playlist-tabel (playlistTable.ts), uit een playlist in de snapshot. Apart van
// playlistTable.ts omdat yearOf() in releaseYears.ts woont, dat de database importeert: dit bestand
// hoort alleen aan de serverkant.
import { yearOf } from "@/lib/library/releaseYears";
import type { PlaylistTableRow } from "./playlistTable";
import type { Playlist } from "./types";

/** Eén rij per nummer, in de volgorde van de playlist. Een item zonder track (een lokaal bestand zonder
 *  metadata, een podcast-aflevering) valt weg, maar telt wel mee in de positie, zodat die met Spotify
 *  blijft kloppen. */
export function toPlaylistTableRows(playlist: Playlist): PlaylistTableRow[] {
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
          },
        ]
      : []
  );
}
