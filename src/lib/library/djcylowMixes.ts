// `djcylow_mix`: in welke mixen op djcylow.com een track zit, als lijst { slug, name }.
//
// WAAROM VIA DE PLAYLIST EN NIET VIA DE TRACKLIST-TEKST: de tracklist van een mix is kale tekst
// ("Artist - Title"), en die op tekst aan 12.000+ tracks koppelen is gokken. De brug (mixes/matchMixes.ts)
// koppelt elke mix al aan zijn eigen MMC-playlist, en de MMC-playlists zijn een weerspiegeling van de
// mixen (Dave's uitgangspunt, zie mixes/types.ts). Een track zit dus in een mix als hij op Spotify in de
// playlist van die mix staat -- op Spotify-ID, precies zoals `spotify_playlist`. Alleen koppelingen die
// echt de eigen playlist van de mix zijn tellen ("own-playlist" en "work-queue"); een grote kleur-emmer
// die alle tracks ook bevat ("bucket-only") niet.
//
// Net als `spotify_playlist` bij ELKE sync opnieuw gezet: het is een feit van de bron, geen keuze van
// jou. Met één uitzondering: zonder mix-bron op deze machine (geen djcylow-react ernaast, zie
// mixes/mixStore.ts) blijft het veld staan zoals het is, want "geen bron" is niet "in geen enkele mix".
//
// planDjcylowMixes() is puur; applyDjcylowMixes() schrijft, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import type { MixLink } from "@/lib/mixes/matchMixes";
import type { Snapshot } from "@/lib/spotify/types";
import { TRACKS_TABLE } from "./db";
import type { DjcylowMixLink } from "./djcylowMix";
import { MIXES_KEY, TRACK_ID_KEY } from "./fields";
import { readTrackIdOf } from "./trackIds";

export { mixUrl, type DjcylowMixLink } from "./djcylowMix";

/** dkj_track_id -> de mixen waarin die track zit, nieuwste mix eerst, zonder dubbelen. */
export function planDjcylowMixes(
  snapshot: Snapshot,
  links: readonly MixLink[],
  trackIdOf: ReadonlyMap<string, string>
): Map<string, DjcylowMixLink[]> {
  const playlistById = new Map(snapshot.playlists.map((p) => [p.id, p]));
  const mixed = links
    .filter((link) => (link.status === "own-playlist" || link.status === "work-queue") && link.playlist && link.mix.slug)
    // Het mix-ID is de datum (YYYYMMDD): aflopend = nieuwste eerst.
    .sort((a, b) => b.mix.id.localeCompare(a.mix.id));
  const plan = new Map<string, DjcylowMixLink[]>();
  for (const link of mixed) {
    const slug = link.mix.slug as string;
    for (const item of playlistById.get(link.playlist!.id)?.tracks ?? []) {
      const spotifyId = item.track?.id;
      const trackId = spotifyId ? trackIdOf.get(spotifyId) : undefined;
      if (!trackId) continue;
      const mixes = plan.get(trackId) ?? [];
      if (!mixes.some((mix) => mix.slug === slug)) mixes.push({ slug, name: link.mix.title || slug });
      plan.set(trackId, mixes);
    }
  }
  return plan;
}

/** Zet `djcylow_mix` bij elke track gelijk aan de koppeling. Geeft het aantal gewijzigde tracks terug.
 *  `mixCount` 0 = geen mix-bron gevonden: dan wordt niets veranderd (zie het commentaar bovenaan). */
export function applyDjcylowMixes(
  db: DatabaseSync,
  snapshot: Snapshot,
  { mixCount, links }: { mixCount: number; links: readonly MixLink[] }
): number {
  if (mixCount === 0) return 0;
  const trackIdOf = readTrackIdOf(db);
  const plan = planDjcylowMixes(snapshot, links, trackIdOf);
  const current = db.prepare(`SELECT ${TRACK_ID_KEY}, "${MIXES_KEY}" AS value FROM ${TRACKS_TABLE}`).all() as {
    dkj_track_id: string;
    value: string | null;
  }[];
  const update = db.prepare(`UPDATE ${TRACKS_TABLE} SET "${MIXES_KEY}" = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const now = new Date().toISOString();
  let changed = 0;
  db.exec("BEGIN");
  try {
    for (const row of current) {
      const mixes = plan.get(row.dkj_track_id);
      const next = mixes && mixes.length > 0 ? JSON.stringify(mixes) : null;
      if (next === row.value) continue;
      update.run(next, now, row.dkj_track_id);
      changed++;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return changed;
}
