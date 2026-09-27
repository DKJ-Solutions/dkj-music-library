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
// Pure module: geen fs, geen sqlite.
import { parsePlaylistName } from "@/lib/spotify/parsePlaylistName";
import { DKJ_ALBUM_OPTIONS } from "./fields";

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

/** Het album van een track: het ene album dat al zijn album-playlists noemen, of null als ze er geen
 *  of verschillende noemen. */
export function albumFromPlaylists(playlistNames: readonly string[]): string | null {
  const albums = albumsOfPlaylists(playlistNames);
  return albums.length === 1 ? albums[0] : null;
}
