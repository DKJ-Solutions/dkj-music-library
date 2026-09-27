// `dkj_group` UIT DE WERELDEN: in welke groepen een track hoort, als lijst.
//
// Elke Spotify-playlist ligt in een wereld (classifyWorld.ts, plus je handmatige correcties in
// worldStore.ts): MMC, DJ Cylow of Privé. De regels (Dave, 27 september 2026):
//   - een track krijgt de groep van elke wereld waarin hij een playlist heeft: mmc -> MMC,
//     djcylow -> DJ CYLOW, prive -> Prive. Staat hij in meer werelden, dan heeft hij meer groepen
//     (het register toont die als menu);
//   - een playlist met een beschrijving hoort sowieso bij MMC;
//   - "Overige" wordt niet afgeleid; die zet je zelf.
// Alleen zolang het veld leeg is, net als de andere afgeleide velden: wat je zelf invult, blijft staan.
//
// De werelden komen uit de snapshot en de worldStore, die allebei niet in git staan; de uitkomst wel
// (in de export), dus het register toont de groepen op elke machine.
//
// planGroups() is puur; fillGroupsFromWorlds() schrijft.
import type { DatabaseSync } from "node:sqlite";
import type { SpotifyWorld } from "@/lib/spotify/classifyWorld";
import { TRACKS_TABLE } from "./db";
import { GROUP_KEY, PLAYLISTS_KEY, TRACK_ID_KEY } from "./fields";

const GROUP_OF_WORLD: Record<SpotifyWorld, string> = { mmc: "MMC", djcylow: "DJ CYLOW", prive: "Prive" };

/** De volgorde van de groepen in de lijst, gelijk aan de options van dkj_group. */
const GROUP_ORDER = ["MMC", "DJ CYLOW", "Prive", "Overige"];

export interface WorldPlaylist {
  id: string;
  world: SpotifyWorld;
  description: string | null;
}

/** De groepen die één playlist geeft. */
export function groupsOfPlaylist(playlist: Omit<WorldPlaylist, "id">): string[] {
  const groups = new Set([GROUP_OF_WORLD[playlist.world]]);
  if (playlist.description && playlist.description.trim() !== "") groups.add("MMC");
  return GROUP_ORDER.filter((group) => groups.has(group));
}

/** De groepen van een track, uit de ID's van zijn playlists; een onbekende playlist telt niet. */
export function planGroups(playlistIds: readonly string[], groupsById: ReadonlyMap<string, readonly string[]>): string[] {
  const groups = new Set(playlistIds.flatMap((id) => groupsById.get(id) ?? []));
  return GROUP_ORDER.filter((group) => groups.has(group));
}

/** Vult `dkj_group` bij elke track waar het nog leeg is. Geeft het aantal gevulde tracks terug. */
export function fillGroupsFromWorlds(db: DatabaseSync, playlists: readonly WorldPlaylist[]): number {
  const groupsById = new Map(playlists.map((playlist) => [playlist.id, groupsOfPlaylist(playlist)]));
  const rows = db
    .prepare(`SELECT ${TRACK_ID_KEY}, "${PLAYLISTS_KEY}" AS playlists FROM ${TRACKS_TABLE} WHERE "${GROUP_KEY}" IS NULL`)
    .all() as { dkj_track_id: string; playlists: string | null }[];
  const fill = db.prepare(`UPDATE ${TRACKS_TABLE} SET "${GROUP_KEY}" = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const now = new Date().toISOString();
  let filled = 0;
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      let ids: string[] = [];
      try {
        const list: unknown = row.playlists ? JSON.parse(row.playlists) : [];
        if (Array.isArray(list)) {
          ids = list
            .map((p) => (typeof p === "object" && p !== null ? (p as { id?: unknown }).id : null))
            .filter((id): id is string => typeof id === "string");
        }
      } catch {
        continue; // met de hand in de database gezet; dan niets afleiden
      }
      const groups = planGroups(ids, groupsById);
      if (groups.length === 0) continue;
      fill.run(JSON.stringify(groups), now, row.dkj_track_id);
      filled++;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return filled;
}
