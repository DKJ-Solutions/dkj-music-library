// `dkj_genre` UIT DE PLAYLISTS: welk genre een track heeft, afgeleid uit de namen van de
// Spotify-playlists waarin hij staat (spotify_playlist).
//
// Per playlist, in deze volgorde:
//   1. Een genre uit dkj_genre als los woord in de naam: "128BPM EDM", "Classic Pop", "Dutch Pop",
//      "| POP |", "🟢 ALT", "Magenta Full | OST". Hoofdletters tellen niet mee; "Popcorn" of
//      "Alternative" tellen niet, alleen het woord zelf.
//   2. De dansreeksen zonder genre in de naam zijn EDM: House Mix, Drum & Bass (Mix), D&B en DNB.
//
// Per track (Dave, 28 september 2026: vul dkj_genre op basis van de playlisttitels): het genre dat de
// meeste van zijn playlists noemen. Bij een gelijke stand blijft het leeg en kies je zelf, net als bij
// dkj_bpm. Gemeten op 11.639 tracks: 10.503 gevuld (EDM 6.922, POP 2.452, ALT 1.090, OST 39), 126
// gelijke standen, 1.010 zonder genre in hun playlists (Top 100, Feestzaal, D&D, Karo's Favorite).
//
// Pure module: geen fs, geen sqlite.
import { DKJ_GENRE_OPTIONS } from "./fields";

const GENRE_WORDS = DKJ_GENRE_OPTIONS.map(
  (genre) => [genre, new RegExp(`(?:^|[^\\p{L}])${genre}(?:[^\\p{L}]|$)`, "iu")] as const
);

const DANCE_SERIES = /house\s*mix|drum\s*(?:&|and|n)\s*bass|(?:^|[^\p{L}])(?:d&b|dnb)(?:[^\p{L}]|$)/iu;

/** Het genre dat een playlistnaam noemt ("EDM"), of null. */
export function genreOfPlaylist(name: string): string | null {
  for (const [genre, word] of GENRE_WORDS) {
    if (word.test(name)) return genre;
  }
  return DANCE_SERIES.test(name) ? "EDM" : null;
}

/** Het genre van een track: dat de meeste van zijn playlists noemen, of null bij geen of een gelijke
 *  stand. */
export function genreFromPlaylists(playlistNames: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const name of playlistNames) {
    const genre = genreOfPlaylist(name);
    if (genre !== null) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || (ranked.length > 1 && ranked[0][1] === ranked[1][1])) return null;
  return ranked[0][0];
}
