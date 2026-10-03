// `spotify_playcount`: hoe vaak je een nummer op Spotify hebt afgespeeld, uit je Extended streaming
// history (issue #74). De Web API kent geen afspeelaantallen per gebruiker; het privacy-export van
// Spotify wel: een zip met `Streaming_History_Audio_*.json`, elk een lijst met één regel per keer dat
// er iets speelde (ook een nummer dat je na twee seconden wegklikte).
//
// WAT ALS EEN PLAY TELT: een regel met een `spotify_track_uri` en minstens MIN_PLAY_MS afgespeeld --
// dezelfde 30 seconden die Spotify zelf als een stream telt. Podcasts en audioboeken hebben geen
// track-URI en vallen dus vanzelf af.
//
// EÉN NUMMER, MEERDERE SPOTIFY-ID'S. Dezelfde opname staat vaak meerdere keren op Spotify (single,
// album, compilatie; zie trackIds.ts), en je history noemt de variant die je toevallig afspeelde. De
// plays van alle varianten tellen daarom op bij het ene dkj_track_id, via de koppeltabel
// `spotify_track_ids`. Een gespeelde variant die niet in de bibliotheek staat, telt nergens mee.
//
// DE HISTORY IS COMPLEET, dus een track zonder enige play krijgt 0 en geen null: null betekent "nog
// niet geïmporteerd", 0 betekent "nooit (30 seconden lang) afgespeeld". Anders dan de eigen velden
// overschrijft een import de vorige waarde wél: een nieuwere export telt alles opnieuw.
//
// countPlays() en planPlaycounts() zijn puur; applyPlaycounts() schrijft, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import { TRACKS_TABLE } from "./db";
import { PLAYCOUNT_KEY, TRACK_ID_KEY } from "./fields";
import { readTrackIdOf } from "./trackIds";

/** Vanaf hoeveel milliseconden een regel als play telt (Spotify's eigen grens voor een stream). */
export const MIN_PLAY_MS = 30_000;

/** Eén regel uit een `Streaming_History_Audio_*.json`; alleen de velden die hier tellen. */
export interface StreamingHistoryEntry {
  ms_played?: number | null;
  spotify_track_uri?: string | null;
}

const TRACK_URI = /^spotify:track:([A-Za-z0-9]+)$/;

/** Het Spotify-track-ID uit een `spotify:track:...`-URI, of null voor iets anders (episode, leeg). */
export function trackIdFromUri(uri: string | null | undefined): string | null {
  const match = uri ? TRACK_URI.exec(uri) : null;
  return match ? match[1] : null;
}

/** Spotify-track-ID -> aantal plays, over alle regels die minstens `minMs` speelden. */
export function countPlays(
  entries: Iterable<StreamingHistoryEntry>,
  minMs: number = MIN_PLAY_MS
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const id = trackIdFromUri(entry.spotify_track_uri);
    if (!id || typeof entry.ms_played !== "number" || entry.ms_played < minMs) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** dkj_track_id -> opgeteld aantal plays over al zijn Spotify-varianten (`trackIdOf`: Spotify-ID ->
 *  dkj_track_id). Alleen tracks met minstens één play staan erin. */
export function planPlaycounts(
  plays: ReadonlyMap<string, number>,
  trackIdOf: ReadonlyMap<string, string>
): Map<string, number> {
  const plan = new Map<string, number>();
  for (const [spotifyId, count] of plays) {
    const trackId = trackIdOf.get(spotifyId);
    if (trackId) plan.set(trackId, (plan.get(trackId) ?? 0) + count);
  }
  return plan;
}

export interface PlaycountResult {
  /** Tracks waarvan het aantal veranderde (alleen die krijgen een nieuwe updated_at). */
  changed: number;
  /** Tracks met minstens één play. */
  played: number;
  /** Plays van Spotify-tracks die niet in de bibliotheek staan. */
  unmatchedPlays: number;
}

/** Zet `spotify_playcount` bij elke track in de bibliotheek: het aantal plays, of 0 zonder plays. */
export function applyPlaycounts(db: DatabaseSync, plays: ReadonlyMap<string, number>): PlaycountResult {
  const trackIdOf = readTrackIdOf(db);
  const rows = db
    .prepare(`SELECT ${TRACK_ID_KEY}, spotify_track_id, "${PLAYCOUNT_KEY}" AS playcount FROM ${TRACKS_TABLE}`)
    .all() as { dkj_track_id: string; spotify_track_id: string | null; playcount: number | null }[];
  // Een track die (nog) niet in de koppeltabel staat, is in elk geval via zijn eigen spotify_track_id te vinden.
  for (const row of rows) {
    if (row.spotify_track_id && !trackIdOf.has(row.spotify_track_id)) trackIdOf.set(row.spotify_track_id, row.dkj_track_id);
  }

  const plan = planPlaycounts(plays, trackIdOf);
  let unmatchedPlays = 0;
  for (const [spotifyId, count] of plays) if (!trackIdOf.has(spotifyId)) unmatchedPlays += count;

  const fill = db.prepare(`UPDATE ${TRACKS_TABLE} SET "${PLAYCOUNT_KEY}" = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const now = new Date().toISOString();
  let changed = 0;
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      const count = plan.get(row.dkj_track_id) ?? 0;
      if (row.playcount === count) continue;
      fill.run(count, now, row.dkj_track_id);
      changed++;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return { changed, played: plan.size, unmatchedPlays };
}
