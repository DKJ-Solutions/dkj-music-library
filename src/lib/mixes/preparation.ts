// Preparation op /mixen/preparation: de Spotify-playlists die op "Vol. X" eindigen -- de werkbakken, waar de
// tracks voor een mix al verzameld zijn maar de mix zelf nog niet gemaakt is (zie `volume` in
// spotify/parsePlaylistName.ts). Elk krijgt een eigen pagina op /mixen/preparation/<playlist-id>.
//
// Pure module: de pagina's lezen de snapshot zelf en geven de playlists hier door; de kruimelnamen voor de
// layout komen via preparationPages.ts, dat ze bewaart.
import { parsePlaylistName, type ParsedPlaylistName } from "@/lib/spotify/parsePlaylistName";
import type { Playlist } from "@/lib/spotify/types";
import { PLANNED_COLOURS } from "./plannedColours";

/** "Vol. X" aan het eind van de naam, ook als "Vol X", "Vol. x" of met een dubbele spatie. */
const ENDS_WITH_VOL_X = /\bvol\.?\s*x\s*$/i;

/** Eindigt deze playlistnaam op "Vol. X"? */
export function isPreparationPlaylist(name: string): boolean {
  return ENDS_WITH_VOL_X.test(name);
}

/** De route van de pagina van één werkbak. */
export function preparationHref(playlistId: string): string {
  return `/mixen/preparation/${encodeURIComponent(playlistId)}`;
}

export interface PreparationPlaylist {
  playlist: Playlist;
  parsed: ParsedPlaylistName;
}

// House Mix vóór Drum & Bass, dan de kleuren in de volgorde van Planned, dan Light vóór Full en (f) vóór (m).
function rank(values: readonly (string | null)[], value: string | null): number {
  const i = value === null ? -1 : values.indexOf(value);
  return i === -1 ? values.length : i;
}

/** De werkbakken uit de snapshot, gesorteerd zoals de cards ze tonen. */
export function preparationPlaylists(playlists: Playlist[]): PreparationPlaylist[] {
  return playlists
    .filter((playlist) => isPreparationPlaylist(playlist.name))
    .map((playlist) => ({ playlist, parsed: parsePlaylistName(playlist.name) }))
    .sort(
      (a, b) =>
        rank(["House Mix", "Drum & Bass (Mix)"], a.parsed.typeLabel) -
          rank(["House Mix", "Drum & Bass (Mix)"], b.parsed.typeLabel) ||
        rank(PLANNED_COLOURS, a.parsed.color) - rank(PLANNED_COLOURS, b.parsed.color) ||
        rank(["Light", "Full"], a.parsed.density) - rank(["Light", "Full"], b.parsed.density) ||
        rank(["f", "m"], a.parsed.gender) - rank(["f", "m"], b.parsed.gender) ||
        a.playlist.name.localeCompare(b.playlist.name),
    );
}

/** De naam van elke werkbak-pagina, per route -- voor breadcrumbTrail (lib/pages.ts), zodat de laatste
 *  kruimel leest wat de h1 leest. */
export function preparationTitlesOf(playlists: Playlist[]): Record<string, string> {
  return Object.fromEntries(
    playlists.filter((p) => isPreparationPlaylist(p.name)).map((p) => [preparationHref(p.id), p.name]),
  );
}
