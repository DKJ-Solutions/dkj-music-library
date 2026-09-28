// `year`: het jaar waarin een nummer is uitgebracht, uit Spotify's `release_date` van het album.
//
// Eén nummer (één dkj_track_id) staat vaak meerdere keren op Spotify: als single, op het album, op een
// compilatie. Elke variant heeft zijn eigen albumdatum, en het nummer kwam uit toen de eerste
// verscheen -- dus telt het VROEGSTE jaar over alle varianten in de snapshot. Een compilatie van 2015
// maakt een single uit 1997 dus niet jonger. Kent de snapshot alleen de compilatie, dan is dat het
// jaar; Spotify weet niet beter.
//
// Net als de andere eigen velden wordt `year` alleen gevuld zolang het leeg is: wat je zelf invult (met
// `library:import`), blijft staan. Het veld heette tot 28 september 2026 `release_year` en was toen nog
// bij geen enkele track gevuld.
//
// Spotify geeft de datum in de precisie die het album heeft: "1997", "1997-05" of "1997-05-12". Alleen
// de eerste vier cijfers tellen. Een album zonder datum, of met "0000" (dat komt voor bij oude
// uploads), levert geen jaar.
//
// planReleaseYears() is puur; applyReleaseYears() schrijft, in één transactie.
import type { DatabaseSync } from "node:sqlite";
import type { Snapshot } from "@/lib/spotify/types";
import { TRACKS_TABLE } from "./db";
import { TRACK_ID_KEY, YEAR_KEY } from "./fields";
import { readTrackIdOf } from "./trackIds";

/** Het jaar uit een Spotify-`release_date`, of null als er geen bruikbaar jaar in staat. */
export function yearOf(releaseDate: string | null | undefined): number | null {
  const match = releaseDate ? /^(\d{4})(?:-|$)/.exec(releaseDate) : null;
  const year = match ? Number(match[1]) : 0;
  return year > 0 ? year : null;
}

/** dkj_track_id -> het vroegste jaar over alle Spotify-varianten van die track in de snapshot. */
export function planReleaseYears(snapshot: Snapshot, trackIdOf: ReadonlyMap<string, string>): Map<string, number> {
  const plan = new Map<string, number>();
  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      const track = item.track;
      const trackId = track ? trackIdOf.get(track.id) : undefined;
      const year = track ? yearOf(track.album.releaseDate) : null;
      if (!trackId || year === null) continue;
      const current = plan.get(trackId);
      if (current === undefined || year < current) plan.set(trackId, year);
    }
  }
  return plan;
}

/** Vult `year` uit de snapshot bij elke track waar het nog leeg is. Geeft het aantal gevulde tracks terug. */
export function applyReleaseYears(db: DatabaseSync, snapshot: Snapshot): number {
  const plan = planReleaseYears(snapshot, readTrackIdOf(db));
  const empty = db.prepare(`SELECT ${TRACK_ID_KEY} FROM ${TRACKS_TABLE} WHERE "${YEAR_KEY}" IS NULL`).all() as {
    dkj_track_id: string;
  }[];
  const fill = db.prepare(`UPDATE ${TRACKS_TABLE} SET "${YEAR_KEY}" = ?, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`);
  const now = new Date().toISOString();
  let filled = 0;
  db.exec("BEGIN");
  try {
    for (const row of empty) {
      const year = plan.get(row.dkj_track_id);
      if (year === undefined) continue;
      fill.run(year, now, row.dkj_track_id);
      filled++;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return filled;
}
