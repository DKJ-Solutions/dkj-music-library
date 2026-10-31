// DE WAARDERING WIJZIGEN: het eerste veld dat je in de frontend zelf aanpast en opslaat (Dave, 29
// september 2026). Het trackregister zet dkj_rating en dkj_mix_rating (31 oktober 2026) via POST
// /api/spotify/rating; hier staat wat die route met de database doet.
//
// Alleen een BESTAANDE track krijgt een waardering: upsertTracks() zou een onbekend ID als nieuwe track
// aanmaken, en een typfout in een ID mag geen lege track in de bibliotheek zetten. De waarde zelf gaat
// langs dezelfde controle als een import (toSqlValue in trackStore.ts), dus alleen tier-1 t/m tier-8.
//
// SERVER-ONLY (via trackStore.ts en node:sqlite). Open de database met withLibrary(), zodat de export in
// git meteen bijgewerkt is.
import type { DatabaseSync } from "node:sqlite";
import { RATING_KEY, RATING_KEYS, TRACK_FIELDS, TRACK_ID_KEY, type RatingKey } from "./fields";
import { getTrack, toSqlValue, upsertTracks } from "./trackStore";

/** Of een veldnaam uit een verzoek een waardering is die het register mag zetten. */
export function isRatingKey(value: unknown): value is RatingKey {
  return (RATING_KEYS as readonly unknown[]).includes(value);
}

/** Zet een waardering (dkj_rating, of dkj_mix_rating) van één track. Geeft de opgeslagen spelling terug
 *  ("TIER-5" wordt "tier-5"), of null als de track niet bestaat. Gooit TrackInputError bij een waarde die
 *  geen optie is. */
export function setTrackRating(db: DatabaseSync, trackId: string, rating: string, key: RatingKey = RATING_KEY): string | null {
  const field = TRACK_FIELDS.find((f) => f.key === key)!;
  const stored = toSqlValue(field, rating) as string;
  if (!getTrack(db, trackId)) return null;
  upsertTracks(db, [{ [TRACK_ID_KEY]: trackId, [key]: stored }]);
  return stored;
}
