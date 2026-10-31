// De rijen van het Trackregister, uit de bibliotheek: gedeeld door /spotify/trackregister (alle tracks) en de
// werkbak-pagina's op /mixen/preparation/<id> (alleen de tracks van die playlist).
//
// SERVER-ONLY: opent de bibliotheek (sqlite) via libraryFile.ts.
import { openLibrary } from "./libraryFile";
import { readArtistNames } from "./artistIds";
import { listTracks } from "./trackStore";
import { toRegisterRow, type RegisterRow } from "./register";
import { orderRowsByPlaylist } from "./playlistOrder";
import { readTrackIdOf } from "./trackIds";
import type { Playlist } from "@/lib/spotify/types";

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

export type PlaylistRegisterRead =
  | { rows: RegisterRow[]; artistCount: number; positions: Record<string, number> }
  | { error: string };

/** Het register van ÉÉN playlist, in de volgorde van die playlist in de snapshot (= die van Spotify), met per
 *  rij zijn plek (index in `playlist.tracks`, de eerste als het nummer er twee keer in staat). Zie
 *  orderRowsByPlaylist voor hoe item en rij aan elkaar gekoppeld worden. */
export function readPlaylistRegister(playlist: Playlist): PlaylistRegisterRead {
  try {
    const { db } = openLibrary();
    try {
      const artistNames = readArtistNames(db);
      const trackIdOf = readTrackIdOf(db);
      const mine = listTracks(db)
        .map((track) => toRegisterRow(track, artistNames))
        .filter((row) => row.playlists.some((p) => p.id === playlist.id));
      const itemIds = playlist.tracks.map((item) => (item.track?.id ? (trackIdOf.get(item.track.id) ?? null) : null));
      const ordered = orderRowsByPlaylist(mine, itemIds);
      const positions: Record<string, number> = {};
      for (const { row, position } of ordered) if (position !== undefined) positions[row.id] = position;
      const rows = ordered.map(({ row }) => row);
      return { rows, positions, artistCount: new Set(rows.flatMap((row) => row.artistIds)).size };
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("[library/readRegister] bibliotheek lezen mislukt:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
