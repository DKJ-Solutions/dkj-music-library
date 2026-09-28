// De rijen van de playlist-tabel (playlistTable.ts), uit een playlist in de snapshot. Apart van
// playlistTable.ts omdat yearOf() in releaseYears.ts woont, dat de database importeert: dit bestand
// hoort alleen aan de serverkant.
//
// HET JAAR: Spotify kent alleen de datum van het album, niet die van het nummer. Op een verzamelalbum of
// een losse heruitgave is dat het jaar van die uitgave (The Best of The Monkees: 2008). Het getoonde
// jaar is daarom het VROEGSTE van drie bronnen (issue #45): het MusicBrainz-jaar (de lokale cache, zie
// musicbrainz/cacheStore.ts), het `year` van het Trackregister (het vroegste jaar over alle
// Spotify-varianten, of wat je zelf hebt ingevuld, zie releaseYears.ts) en het albumjaar. Kent geen van
// de drie een jaar, dan blijft de cel leeg.
import type { DatabaseSync } from "node:sqlite";
import { yearOf } from "@/lib/library/releaseYears";
import { readTrackIdOf } from "@/lib/library/trackIds";
import { listTracks } from "@/lib/library/trackStore";
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

/** Spotify track-id -> het `year` van die track in de bibliotheek, voor elke gekoppelde track met een jaar. */
export function libraryYearsBySpotifyId(db: DatabaseSync): Map<string, number> {
  const years = new Map<string, number>();
  for (const track of listTracks(db)) {
    if (typeof track.year === "number") years.set(String(track.dkj_track_id), track.year);
  }
  const bySpotifyId = new Map<string, number>();
  for (const [spotifyId, trackId] of readTrackIdOf(db)) {
    const year = years.get(trackId);
    if (year !== undefined) bySpotifyId.set(spotifyId, year);
  }
  return bySpotifyId;
}

/** Het vroegste van de gegeven jaren, of null als er geen van bekend is. */
function earliestYear(...years: (number | null | undefined)[]): number | null {
  let earliest: number | null = null;
  for (const year of years) {
    if (year == null) continue;
    if (earliest === null || year < earliest) earliest = year;
  }
  return earliest;
}

/** Eén rij per nummer, in de volgorde van de playlist. Een item zonder track (een lokaal bestand zonder
 *  metadata, een podcast-aflevering) valt weg, maar telt wel mee in de positie, zodat die met Spotify
 *  blijft kloppen. Een toevoeger die niet in `userNames` staat, blijft als user-id staan; het jaar is het
 *  vroegste van MusicBrainz, het Trackregister en het albumjaar (zie de kop hierboven). */
export function toPlaylistTableRows(
  playlist: Playlist,
  userNames: ReadonlyMap<string, string> = new Map(),
  libraryYears: ReadonlyMap<string, number> = new Map(),
  musicBrainzYears: ReadonlyMap<string, number> = new Map()
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
            year: earliestYear(
              musicBrainzYears.get(item.track.id),
              libraryYears.get(item.track.id),
              yearOf(item.track.album.releaseDate)
            ),
            albumYear: yearOf(item.track.album.releaseDate),
            durationMs: item.track.durationMs,
            addedAt: item.addedAt,
            addedBy: item.addedBy ? (userNames.get(item.addedBy) ?? item.addedBy) : null,
          },
        ]
      : []
  );
}
