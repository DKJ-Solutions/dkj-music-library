// De rijen van het Trackregister, uit de bibliotheek: gedeeld door /spotify/trackregister (alle tracks) en de
// werkbak-pagina's op /mixen/preparation/<id> (alleen de tracks van die playlist).
//
// SERVER-ONLY: opent de bibliotheek (sqlite) via libraryFile.ts.
import { openLibrary } from "./libraryFile";
import { readArtistNames } from "./artistIds";
import { listTracks } from "./trackStore";
import { toRegisterRow, type RegisterRow } from "./register";

export type RegisterRead = { rows: RegisterRow[]; artistCount: number } | { error: string };

/** Het register, of de fout waarom de bibliotheek niet te lezen is. `keep` beperkt de rijen; `artistCount`
 *  telt dan alleen de artiesten van die rijen. */
export function readRegister(keep?: (row: RegisterRow) => boolean): RegisterRead {
  try {
    const { db } = openLibrary();
    try {
      const artistNames = readArtistNames(db);
      const all = listTracks(db).map((track) => toRegisterRow(track, artistNames));
      if (!keep) return { rows: all, artistCount: Object.keys(artistNames).length };
      const rows = all.filter(keep);
      return { rows, artistCount: new Set(rows.flatMap((row) => row.artistIds)).size };
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("[library/readRegister] bibliotheek lezen mislukt:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
