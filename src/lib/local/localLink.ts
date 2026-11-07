// Een lokaal bestand zelf aan een track koppelen (#151): zet of wist `dkj_local_file` via POST
// /api/local/link, vanaf /compare/pc-spotify. Zoals rating.ts: alleen een BESTAANDE track, want
// upsertTracks() zou een onbekend ID als nieuwe track aanmaken.
//
// SERVER-ONLY (via trackStore.ts en node:sqlite). Open de database met withLibrary(), zodat de export in
// git meteen bijgewerkt is.
import type { DatabaseSync } from "node:sqlite";
import { LOCAL_FILE_KEY, TRACK_ID_KEY } from "@/lib/library/fields";
import { getTrack, upsertTracks } from "@/lib/library/trackStore";

/** Het pad zoals het opgeslagen wordt: "/" ertussen, zonder witruimte eromheen; leeg wordt null. */
export function normaliseLocalPath(value: string | null): string | null {
  if (value === null) return null;
  const path = value.replace(/\\/g, "/").trim();
  return path === "" ? null : path;
}

/** Zet (of wist, met null) de eigen koppeling van één track. Geeft het opgeslagen pad terug, of
 *  `undefined` als de track niet bestaat. */
export function setTrackLocalFile(db: DatabaseSync, trackId: string, localFile: string | null): string | null | undefined {
  if (!getTrack(db, trackId)) return undefined;
  const stored = normaliseLocalPath(localFile);
  upsertTracks(db, [{ [TRACK_ID_KEY]: trackId, [LOCAL_FILE_KEY]: stored }]);
  return stored;
}
