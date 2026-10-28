// De kruimelnamen van de werkbak-pagina's op /mixen/preparation/<id>, voor de layout. Die vraagt ze bij elk
// verzoek, en de snapshot is 30 MB -- dus worden ze bewaard tot de snapshot op schijf wijzigt.
//
// SERVER-ONLY: leest via snapshotStore.ts van schijf.
import { readSnapshot, snapshotVersion } from "@/lib/spotify/snapshotStore";
import { preparationTitlesOf } from "./preparation";

let cached: { version: number; titles: Record<string, string> } | null = null;

/** De naam van elke werkbak-pagina, per route -- voor breadcrumbTrail (lib/pages.ts). */
export function preparationPageTitles(): Record<string, string> {
  const version = snapshotVersion();
  if (version === null) return {};
  if (cached?.version !== version) {
    cached = { version, titles: preparationTitlesOf(readSnapshot()?.playlists ?? []) };
  }
  return cached.titles;
}
