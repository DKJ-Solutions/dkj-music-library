// Dave's drietrapsindeling per playlist-rij, op één plek (2026-07-25):
//
//   TYPE      EDM · ROCK · POP · ALT
//   GENRE     House · Drum & Bass · Techno · Nu-Disco
//   SUBGENRE  Tech House · Liquid Drum & Bass · Melodic Techno
//
// GENRE en SUBGENRE komen rechtstreeks uit de gekoppelde mix; TYPE wordt afgeleid (genreFamilies.ts)
// met de naamgevingsfamilie uit de playlistnaam als terugval. Die drie regeltjes werden op drie
// plekken gebruikt -- de tabelcel, de sorteersleutel en het filter -- en horen dus één bron te zijn.
//
// Puur functioneel (geen fs/React): vrij importeerbaar, ook client-side.
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import { typeLabelToFamily, type GenreFamily } from "@/lib/mixes/genreFamilies";
import type { PlaylistMixInfo } from "@/lib/mixes/playlistMixInfo";

/** De bovenste laag: uit de gekoppelde mix, of anders uit de naamgevingsfamilie van de playlistnaam.
 *  Zo blijft de kolom ook gevuld op de kleur-emmers en werkbakken, die geen eigen mix-JSON hebben. */
export function playlistFamily(
  playlist: EnrichedPlaylist,
  mixInfo: PlaylistMixInfo | null
): GenreFamily | null {
  return mixInfo?.family ?? typeLabelToFamily(playlist.parsed.typeLabel);
}

/** De middenlaag -- alleen bekend via een gekoppelde mix. */
export function playlistGenre(mixInfo: PlaylistMixInfo | null): string | null {
  return mixInfo?.genre ?? null;
}

/** De fijnste laag -- alleen bekend via een gekoppelde mix. */
export function playlistSubgenre(mixInfo: PlaylistMixInfo | null): string | null {
  return mixInfo?.subgenre ?? null;
}

export interface GenreLayerOptions {
  families: string[];
  genres: string[];
  subgenres: string[];
}

/** De keuzelijsten voor de drie filter-selects: precies de waarden die in déze lijst voorkomen,
 *  alfabetisch.
 *
 *  Bewust afgeleid uit de data en niet hardgecodeerd. De subgenres zijn Dave's vrije tekstveld (tien
 *  waarden op dit moment, groeit mee met de website), en een vaste lijst zou een keuze aanbieden die
 *  nul rijen oplevert -- bv. ROCK of POP, die vandaag in geen enkele mix voorkomen. */
export function collectGenreLayerOptions(
  playlists: readonly EnrichedPlaylist[],
  mixInfoById: Record<string, PlaylistMixInfo>
): GenreLayerOptions {
  const families = new Set<string>();
  const genres = new Set<string>();
  const subgenres = new Set<string>();

  for (const playlist of playlists) {
    const mixInfo = mixInfoById[playlist.id] ?? null;
    const family = playlistFamily(playlist, mixInfo);
    const genre = playlistGenre(mixInfo);
    const subgenre = playlistSubgenre(mixInfo);
    if (family) families.add(family);
    if (genre) genres.add(genre);
    if (subgenre) subgenres.add(subgenre);
  }

  const alfabetisch = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, "nl"));
  return {
    families: alfabetisch(families),
    genres: alfabetisch(genres),
    subgenres: alfabetisch(subgenres),
  };
}
