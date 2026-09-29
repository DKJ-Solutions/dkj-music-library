// DE WAARDERING WIJZIGEN: het eerste veld dat je in de frontend zelf aanpast en opslaat (Dave, 29
// september 2026). Het trackregister zet dkj_rating via POST /api/spotify/rating; hier staat wat die
// route met de database doet.
//
// Alleen een BESTAANDE track krijgt een waardering: upsertTracks() zou een onbekend ID als nieuwe track
// aanmaken, en een typfout in een ID mag geen lege track in de bibliotheek zetten. De waarde zelf gaat
// langs dezelfde controle als een import (toSqlValue in trackStore.ts), dus alleen tier-1 t/m tier-8.
//
// SERVER-ONLY (via trackStore.ts en node:sqlite). Open de database met withLibrary(), zodat de export in
// git meteen bijgewerkt is.
import type { DatabaseSync } from "node:sqlite";
import { RATING_KEY, TRACK_FIELDS, TRACK_ID_KEY } from "./fields";
import { getTrack, toSqlValue, upsertTracks } from "./trackStore";

const RATING_FIELD = TRACK_FIELDS.find((field) => field.key === RATING_KEY)!;

/** Zet dkj_rating van één track. Geeft de opgeslagen spelling terug ("TIER-5" wordt "tier-5"), of null
 *  als de track niet bestaat. Gooit TrackInputError bij een waarde die geen optie is. */
export function setTrackRating(db: DatabaseSync, trackId: string, rating: string): string | null {
  const stored = toSqlValue(RATING_FIELD, rating) as string;
  if (!getTrack(db, trackId)) return null;
  upsertTracks(db, [{ [TRACK_ID_KEY]: trackId, [RATING_KEY]: stored }]);
  return stored;
}
