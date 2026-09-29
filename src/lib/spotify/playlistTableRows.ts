// De rijen van de playlist-tabel (playlistTable.ts), uit een playlist in de snapshot. Apart van
// playlistTable.ts omdat yearOf() in releaseYears.ts woont, dat de database importeert: dit bestand
// hoort alleen aan de serverkant.
//
// HET JAAR: Spotify kent alleen de datum van het album, niet die van het nummer. Op een verzamelalbum of
// een losse heruitgave is dat het jaar van die uitgave (The Best of The Monkees: 2008). Het getoonde
// jaar is daarom het VROEGSTE van drie bronnen (issue #45): het MusicBrainz-jaar (de lokale cache, zie
// musicbrainz/cacheStore.ts), het `year` van het Trackregister (het vroegste jaar over alle
// Spotify-varianten, of wat je zelf hebt ingevuld, zie releaseYears.ts) en het albumjaar. Kent geen van
// de drie een jaar, dan blijft de cel leeg. Een handmatig vastgezet jaar (musicbrainz/
// releaseYearOverrides.ts, issue #47) gaat boven alle drie.
import type { DatabaseSync } from "node:sqlite";
import { openLibrary } from "@/lib/library/libraryFile";
import { yearOf } from "@/lib/library/releaseYears";
import { readTrackIdOf } from "@/lib/library/trackIds";
import { listTracks } from "@/lib/library/trackStore";
import { RELEASE_YEAR_OVERRIDES } from "@/lib/musicbrainz/releaseYearOverrides";
import { classicPopLabel, isClassicPopPlaylist, type ClassicPopRow } from "./classicPopTable";
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

/** libraryYearsBySpotifyId() voor een pagina: opent de bibliotheek zelf, en geeft bij een leesfout een lege
 *  map, zodat de tabel dan het albumjaar toont -- een minder precies jaar is beter dan geen pagina. `route`
 *  noemt de pagina in de foutmelding. */
export function readLibraryYears(route: string): Map<string, number> {
  try {
    const { db } = openLibrary();
    try {
      return libraryYearsBySpotifyId(db);
    } finally {
      db.close();
    }
  } catch (err) {
    console.error(`[${route}] bibliotheek lezen mislukt, de tabel toont het albumjaar:`, err);
    return new Map();
  }
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

/** Het jaar van een rij: het vastgezette jaar als dat er is, anders het vroegste van de drie bronnen. */
function rowYear(
  spotifyId: string,
  sources: (number | null | undefined)[],
  yearOverrides: ReadonlyMap<string, number>
): number | null {
  return yearOverrides.get(spotifyId) ?? earliestYear(...sources);
}

/** Eén rij per nummer, in de volgorde van de playlist. Een item zonder track (een lokaal bestand zonder
 *  metadata, een podcast-aflevering) valt weg, maar telt wel mee in de positie, zodat die met Spotify
 *  blijft kloppen. Een toevoeger die niet in `userNames` staat, blijft als user-id staan; het jaar is het
 *  vroegste van MusicBrainz, het Trackregister en het albumjaar, tenzij het vastgezet is (zie de kop hierboven). */
export function toPlaylistTableRows(
  playlist: Playlist,
  userNames: ReadonlyMap<string, string> = new Map(),
  libraryYears: ReadonlyMap<string, number> = new Map(),
  musicBrainzYears: ReadonlyMap<string, number> = new Map(),
  yearOverrides: ReadonlyMap<string, number> = RELEASE_YEAR_OVERRIDES
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
            year: rowYear(
              item.track.id,
              [musicBrainzYears.get(item.track.id), libraryYears.get(item.track.id), yearOf(item.track.album.releaseDate)],
              yearOverrides
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

/** De rijen van de Classic Pop-tabel: elk nummer uit een playlist met "Classic Pop" in de naam, één keer, met
 *  de playlists waarin het staat. Een nummer valt samen op zijn Spotify track-id, dus twee versies van hetzelfde
 *  nummer (een single en een verzamelalbum) blijven twee rijen -- precies zoals Spotify ze ook uit elkaar houdt.
 *  De volgorde is die van de eerste keer dat een nummer in de snapshot opduikt; het jaar volgt dezelfde regel
 *  als toPlaylistTableRows (zie de kop hierboven). */
export function toClassicPopRows(
  playlists: readonly Playlist[],
  libraryYears: ReadonlyMap<string, number> = new Map(),
  musicBrainzYears: ReadonlyMap<string, number> = new Map(),
  yearOverrides: ReadonlyMap<string, number> = RELEASE_YEAR_OVERRIDES
): ClassicPopRow[] {
  const rows = new Map<string, ClassicPopRow>();
  for (const playlist of playlists) {
    if (!isClassicPopPlaylist(playlist.name)) continue;
    const ref = { id: playlist.id, name: playlist.name, label: classicPopLabel(playlist.name) };
    for (const item of playlist.tracks) {
      const track = item.track;
      if (!track) continue;
      let row = rows.get(track.id);
      if (!row) {
        const albumYear = yearOf(track.album.releaseDate);
        row = {
          trackId: track.id,
          title: track.name,
          artists: track.artists.map((artist) => artist.name),
          album: track.album.name,
          year: rowYear(track.id, [musicBrainzYears.get(track.id), libraryYears.get(track.id), albumYear], yearOverrides),
          albumYear,
          durationMs: track.durationMs,
          playlists: [],
          firstAddedAt: null,
        };
        rows.set(track.id, row);
      }
      // Hetzelfde nummer twee keer in één playlist telt die playlist één keer.
      if (!row.playlists.some((p) => p.id === ref.id)) row.playlists.push(ref);
      // ISO-tijdstippen van Spotify (allemaal UTC, "Z") sorteren als tekst goed.
      if (item.addedAt && (row.firstAddedAt === null || item.addedAt < row.firstAddedAt)) row.firstAddedAt = item.addedAt;
    }
  }
  return [...rows.values()];
}
