// `dkj_album` UIT DE PLAYLISTS: welk eigen album een track heeft, afgeleid uit de namen van de
// Spotify-playlists waarin hij staat (spotify_playlist).
//
// Een playlistnaam noemt het album in zijn kleur, dichtheid en geslacht ("Magenta Light (m) ♦️ 128BPM
// EDM", "House Mix 🟠 Orange Full (f) 🟠 Vol. X"); parsePlaylistName() haalt die eruit, in welke volgorde
// ze ook staan. Een naam zonder een van de drie ("Green Full | OST" heeft geen f/m) levert geen album.
//
// De regel (Dave, 27 september 2026): alleen als ALLE album-playlists van een track hetzelfde album
// noemen, wordt dat het album. Noemen ze verschillende albums ("Dancing Queen" staat in Cyan Full (f),
// Green Full (f) en Green Light (f)), dan blijft het veld leeg en kies je zelf. Gemeten op 12.471
// tracks: 8.257 eenduidig, 2.452 met meerdere albums, 1.762 zonder album-playlist.
//
// Eén uitzondering gaat voor (Dave, 29 september 2026): staat een track in een playlist met "Feestzaal"
// in de naam ("Phase 2A, Feestzaal (2026)", "ALLES | Feestzaal (2026) | DJ Cylow"), dan is zijn album
// Cyan Full (f), wat zijn andere playlists ook noemen. Net als elk afgeleid veld alleen zolang het leeg
// is: een album dat er al staat, blijft staan. Gemeten op 611 Feestzaal-tracks: 324 zonder andere
// album-playlist, ~110 waarvan de andere playlists verschillen, ~177 die al een album hadden.
//
// Pure module: geen fs, geen sqlite.
import { parsePlaylistName } from "@/lib/spotify/parsePlaylistName";
import { DKJ_ALBUM_OPTIONS } from "./fields";

/** Het album van elke track in een Feestzaal-playlist (zie boven). */
export const FEESTZAAL_ALBUM = "Cyan Full (f)";

/** Noemt deze playlistnaam de Feestzaal? Los woord, hoofdletters tellen niet. */
export function isFeestzaalPlaylist(name: string): boolean {
  return /\bfeestzaal\b/i.test(name);
}

/** Het album dat een playlistnaam noemt, of null. */
export function albumOfPlaylist(name: string): string | null {
  const parsed = parsePlaylistName(name);
  if (!parsed.color || !parsed.density || !parsed.gender) return null;
  const album = `${parsed.color} ${parsed.density} (${parsed.gender})`;
  return DKJ_ALBUM_OPTIONS.includes(album) ? album : null;
}

/** Alle albums die de playlists van een track noemen, elk één keer, in de volgorde van DKJ_ALBUM_OPTIONS. */
export function albumsOfPlaylists(playlistNames: readonly string[]): string[] {
  const albums = new Set(playlistNames.map(albumOfPlaylist));
  return DKJ_ALBUM_OPTIONS.filter((album) => albums.has(album));
}

/** Het album van een track: Cyan Full (f) als hij in een Feestzaal-playlist staat, anders het ene album
 *  dat al zijn album-playlists noemen, of null als ze er geen of verschillende noemen. */
export function albumFromPlaylists(playlistNames: readonly string[]): string | null {
  if (playlistNames.some(isFeestzaalPlaylist)) return FEESTZAAL_ALBUM;
  const albums = albumsOfPlaylists(playlistNames);
  return albums.length === 1 ? albums[0] : null;
}
