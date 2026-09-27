// EIGEN TRACK-ID'S UIT DE SPOTIFY-SNAPSHOT: elk NUMMER krijgt één oplopend ID (T000001, T000002, ...).
//
// Een nummer is niet hetzelfde als een Spotify-track. Dezelfde opname staat vaak meerdere keren op
// Spotify (single, album, compilatie), elk met een eigen Spotify-ID. Twee Spotify-tracks tellen als
// hetzelfde nummer als de titel gelijk is (hoofdletterongevoelig, spaties aan de randen genegeerd) en
// de artiesten precies dezelfde zijn (op artist-id). Een "Radio Edit" of remix heeft een andere titel
// en blijft dus een eigen nummer.
//
// STABIEL OVER SYNCS HEEN. De koppeltabel `spotify_track_ids` onthoudt per Spotify-ID welk eigen ID
// het kreeg, samen met de nummer-sleutel. Een bekend Spotify-ID houdt zijn ID. Een nieuw Spotify-ID
// van een bekend nummer krijgt het ID van dat nummer, ook als de oude variant intussen uit je
// playlists is verdwenen. Alleen een echt nieuw nummer krijgt het volgende vrije nummer.
//
// Bestaande rijen in `tracks` worden nooit aangepast: een nieuw nummer krijgt bij het aanmaken zijn
// Spotify-metadata (titel, artiesten, album, duur), en alles wat je daarna zelf invult blijft staan.
//
// planTrackIds() is puur (geen database) en daardoor los te testen; applyTrackIdsFromSnapshot()
// voert het plan uit, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import type { Snapshot, Track } from "@/lib/spotify/types";
import { TRACKS_TABLE } from "./db";
import { TRACK_FIELDS, TRACK_ID_KEY } from "./fields";
import { toSqlValue, type TrackValue } from "./trackStore";

export const SPOTIFY_LINK_TABLE = "spotify_track_ids";

const TRACK_ID_PREFIX = "T";
const TRACK_ID_DIGITS = 6;
const OWN_ID_SHAPE = /^T(\d+)$/;

/** Het eigen ID bij volgnummer `n`: T000001. Boven de 999999 groeit het gewoon door (T1000000). */
export function formatTrackId(n: number): string {
  return TRACK_ID_PREFIX + String(n).padStart(TRACK_ID_DIGITS, "0");
}

/** De sleutel waarop Spotify-tracks tot één nummer samenvallen: titel + gesorteerde artist-id's. */
export function songKey(track: Pick<Track, "name" | "artists">): string {
  const artists = track.artists.map((a) => a.id).sort().join(",");
  return `${track.name.trim().toLowerCase()}|${artists}`;
}

export interface SpotifyLink {
  spotifyTrackId: string;
  trackId: string;
  songKey: string;
}

export interface NewTrack {
  trackId: string;
  /** De Spotify-track waarmee dit nummer voor het eerst gezien werd; levert de metadata. */
  track: Track;
}

export interface TrackIdPlan {
  /** Nummers die nog geen eigen ID hadden, in volgorde van toekenning. */
  newTracks: NewTrack[];
  /** Spotify-ID's die nog niet in de koppeltabel stonden (ook nieuwe varianten van bekende nummers). */
  newLinks: SpotifyLink[];
}

/** Bepaalt welke Spotify-tracks uit de snapshot een (nieuw of bestaand) eigen ID krijgen. Volgorde van
 *  toekenning = volgorde van eerste voorkomen in de snapshot (playlist voor playlist), zodat hetzelfde
 *  snapshot altijd dezelfde nummers oplevert. Items zonder track of zonder Spotify-ID worden
 *  overgeslagen. */
export function planTrackIds(
  snapshot: Snapshot,
  existingLinks: readonly SpotifyLink[],
  existingTrackIds: readonly string[]
): TrackIdPlan {
  const bySpotifyId = new Map(existingLinks.map((link) => [link.spotifyTrackId, link.trackId]));
  const bySongKey = new Map(existingLinks.map((link) => [link.songKey, link.trackId]));

  let next = 1;
  for (const id of existingTrackIds) {
    const hit = OWN_ID_SHAPE.exec(id);
    if (hit) next = Math.max(next, Number(hit[1]) + 1);
  }

  const plan: TrackIdPlan = { newTracks: [], newLinks: [] };
  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      const track = item.track;
      if (!track?.id || bySpotifyId.has(track.id)) continue;

      const key = songKey(track);
      let trackId = bySongKey.get(key);
      if (!trackId) {
        trackId = formatTrackId(next++);
        bySongKey.set(key, trackId);
        plan.newTracks.push({ trackId, track });
      }
      bySpotifyId.set(track.id, trackId);
      plan.newLinks.push({ spotifyTrackId: track.id, trackId, songKey: key });
    }
  }
  return plan;
}

/** Maakt de koppeltabel als die er nog niet is. */
export function ensureSpotifyLinkTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${SPOTIFY_LINK_TABLE} (
      spotify_track_id TEXT PRIMARY KEY NOT NULL,
      ${TRACK_ID_KEY} TEXT NOT NULL,
      song_key TEXT NOT NULL
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS ${SPOTIFY_LINK_TABLE}_song_key ON ${SPOTIFY_LINK_TABLE} (song_key)`);
}

function readLinks(db: DatabaseSync): SpotifyLink[] {
  const rows = db
    .prepare(`SELECT spotify_track_id, ${TRACK_ID_KEY}, song_key FROM ${SPOTIFY_LINK_TABLE}`)
    .all() as { spotify_track_id: string; track_id: string; song_key: string }[];
  return rows.map((row) => ({ spotifyTrackId: row.spotify_track_id, trackId: row.track_id, songKey: row.song_key }));
}

/** De Spotify-metadata waarmee een nieuw nummer in `tracks` komt. */
function metadataOf(track: Track): Record<string, TrackValue> {
  return {
    spotify_track_id: track.id,
    title: track.name,
    artists: track.artists.map((a) => a.name),
    album: track.album.name,
    duration_ms: track.durationMs,
  };
}

export interface TrackIdResult {
  /** Nummers die in deze run een nieuw eigen ID kregen. */
  newTracks: number;
  /** Spotify-ID's die in deze run gekoppeld werden (nieuwe nummers + nieuwe varianten). */
  newLinks: number;
  /** Totaal aantal Spotify-ID's in de koppeltabel na deze run. */
  totalLinks: number;
}

/** Kent eigen ID's toe aan alles in de snapshot wat er nog geen heeft, in één transactie. Opnieuw
 *  draaien op dezelfde snapshot doet niets. */
export function applyTrackIdsFromSnapshot(db: DatabaseSync, snapshot: Snapshot): TrackIdResult {
  ensureSpotifyLinkTable(db);
  const existingIds = (db.prepare(`SELECT ${TRACK_ID_KEY} FROM ${TRACKS_TABLE}`).all() as { track_id: string }[]).map(
    (row) => row.track_id
  );
  const links = readLinks(db);
  const plan = planTrackIds(snapshot, links, existingIds);

  const fields = new Map(TRACK_FIELDS.map((field) => [field.key, field]));
  const now = new Date().toISOString();
  const insertLink = db.prepare(
    `INSERT INTO ${SPOTIFY_LINK_TABLE} (spotify_track_id, ${TRACK_ID_KEY}, song_key) VALUES (?, ?, ?)`
  );

  db.exec("BEGIN");
  try {
    for (const { trackId, track } of plan.newTracks) {
      // Alleen velden die (nog) in fields.ts staan -- wie er een weghaalt, krijgt hier geen fout.
      const entries = Object.entries(metadataOf(track)).filter(([key]) => fields.has(key));
      const columns = [TRACK_ID_KEY, "created_at", "updated_at", ...entries.map(([key]) => key)];
      db.prepare(
        `INSERT INTO ${TRACKS_TABLE} (${columns.map((c) => `"${c}"`).join(", ")}) ` +
          `VALUES (${columns.map(() => "?").join(", ")}) ON CONFLICT(${TRACK_ID_KEY}) DO NOTHING`
      ).run(trackId, now, now, ...entries.map(([key, value]) => toSqlValue(fields.get(key)!, value)));
    }
    for (const link of plan.newLinks) insertLink.run(link.spotifyTrackId, link.trackId, link.songKey);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return {
    newTracks: plan.newTracks.length,
    newLinks: plan.newLinks.length,
    totalLinks: links.length + plan.newLinks.length,
  };
}
