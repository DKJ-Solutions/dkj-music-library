// `spotify_playlist`: in welke Spotify-playlists een track staat, als lijst { id, name }.
//
// Anders dan de andere eigen velden wordt dit veld bij ELKE sync opnieuw gezet, niet alleen zolang het
// leeg is: welke playlists een track heeft, is een feit van Spotify, geen keuze van jou. Een track die
// uit alle playlists verdwijnt, krijgt null. Alleen wat echt verandert, wordt geschreven, zodat de
// export in git niet bij elke sync helemaal verschuift.
//
// De volgorde is die van de snapshot (de volgorde van je playlists in Spotify), en elke playlist staat
// er één keer in, ook als de track er twee keer in zit of als twee releasevarianten van hetzelfde
// nummer (zelfde dkj_track_id) er allebei in staan.
//
// De namen staan in de export in git, en die repo is publiek; daar is bewust voor gekozen (Dave, 27
// september 2026), zodat het register op elke machine de labels toont.
//
// planPlaylistLinks() is puur; applyPlaylistLinks() schrijft, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import type { Snapshot } from "@/lib/spotify/types";
import { TRACKS_TABLE } from "./db";
import { PLAYLISTS_KEY, TRACK_ID_KEY } from "./fields";
import type { PlaylistLink } from "./playlistLink";
import { SPOTIFY_LINK_TABLE, ensureSpotifyLinkTable } from "./trackIds";

export { playlistUrl, type PlaylistLink } from "./playlistLink";

/** dkj_track_id -> de playlists waarin die track staat, in snapshot-volgorde, zonder dubbelen. */
export function planPlaylistLinks(
  snapshot: Snapshot,
  trackIdOf: ReadonlyMap<string, string>
): Map<string, PlaylistLink[]> {
  const plan = new Map<string, PlaylistLink[]>();
  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      const spotifyId = item.track?.id;
      const trackId = spotifyId ? trackIdOf.get(spotifyId) : undefined;
      if (!trackId) continue;
      const links = plan.get(trackId) ?? [];
      if (!links.some((link) => link.id === playlist.id)) links.push({ id: playlist.id, name: playlist.name });
      plan.set(trackId, links);
    }
  }
  return plan;
}

/** Zet `spotify_playlist` bij elke track gelijk aan de snapshot. Geeft het aantal gewijzigde tracks terug. */
export function applyPlaylistLinks(db: DatabaseSync, snapshot: Snapshot): number {
  ensureSpotifyLinkTable(db);
  const trackIdOf = new Map(
    (
      db.prepare(`SELECT spotify_track_id, ${TRACK_ID_KEY} FROM ${SPOTIFY_LINK_TABLE}`).all() as {
        spotify_track_id: string;
        dkj_track_id: string;
      }[]
    ).map((row) => [row.spotify_track_id, row.dkj_track_id])
  );
  const plan = planPlaylistLinks(snapshot, trackIdOf);
  const current = db.prepare(`SELECT ${TRACK_ID_KEY}, "${PLAYLISTS_KEY}" AS value FROM ${TRACKS_TABLE}`).all() as {
    dkj_track_id: string;
    value: string | null;
  }[];
  const update = db.prepare(`UPDATE ${TRACKS_TABLE} SET "${PLAYLISTS_KEY}" = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const now = new Date().toISOString();
  let changed = 0;
  db.exec("BEGIN");
  try {
    for (const row of current) {
      const links = plan.get(row.dkj_track_id);
      const next = links && links.length > 0 ? JSON.stringify(links) : null;
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
