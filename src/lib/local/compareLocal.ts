// PC <-> Spotify (#144): de tracks in de Spotify-playlists naast de bestanden in de lokale muziekmap,
// gekoppeld op `dkj_file` (de bestandsnaam zonder extensie, fileName.ts). Hoofdletters, witruimte en
// Unicode-vorm tellen niet mee. Een naam die anders gespeld is (een remix, "feat."), koppelt niet: een
// vagere koppeling op artiest + titel of op tags is een volgende stap, niet deze.
//
// Pure module: geen fs, geen sqlite.
import type { LocalFile } from "./scanMusicFolder";

export interface CompareTrack {
  id: string;
  /** `dkj_file`, of null als de track er (nog) geen heeft. */
  file: string | null;
  playlists: readonly { id: string; name: string }[];
}

export interface PlaylistDownloads {
  id: string;
  name: string;
  /** De `dkj_file`-namen die in deze playlist staan en geen bestand hebben, op naam gesorteerd. */
  files: string[];
}

export interface LocalComparison {
  /** Per playlist wat nog gedownload moet worden, alleen playlists met iets te downloaden, in de volgorde
   *  waarin ze voor het eerst langskomen. */
  toDownload: PlaylistDownloads[];
  /** Het aantal tracks zonder bestand (een track in twee playlists telt één keer). */
  toDownloadCount: number;
  /** Bestanden waar geen track bij hoort. */
  localOnly: LocalFile[];
  /** Het aantal tracks met een bestand. */
  matchedCount: number;
  /** Tracks in een playlist zonder `dkj_file`: die zijn niet te koppelen. */
  withoutFileName: number;
}

/** De sleutel waarop gekoppeld wordt. */
export function matchKey(name: string): string {
  return name.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function compareLocal(tracks: readonly CompareTrack[], files: readonly LocalFile[]): LocalComparison {
  const filesByKey = new Map<string, LocalFile[]>();
  for (const file of files) {
    const key = matchKey(file.name);
    filesByKey.set(key, [...(filesByKey.get(key) ?? []), file]);
  }

  const claimed = new Set<string>();
  const perPlaylist = new Map<string, PlaylistDownloads>();
  let toDownloadCount = 0;
  let matchedCount = 0;
  let withoutFileName = 0;

  for (const track of tracks) {
    if (track.playlists.length === 0) continue;
    if (!track.file || track.file.trim() === "") {
      withoutFileName++;
      continue;
    }
    const key = matchKey(track.file);
    if (filesByKey.has(key)) {
      claimed.add(key);
      matchedCount++;
      continue;
    }
    toDownloadCount++;
    for (const playlist of track.playlists) {
      const entry = perPlaylist.get(playlist.id) ?? { id: playlist.id, name: playlist.name, files: [] };
      entry.files.push(track.file);
      perPlaylist.set(playlist.id, entry);
    }
  }

  const toDownload = [...perPlaylist.values()].map((entry) => ({
    ...entry,
    files: entry.files.sort((a, b) => a.localeCompare(b)),
  }));
  const localOnly = files.filter((file) => !claimed.has(matchKey(file.name)));
  return { toDownload, toDownloadCount, localOnly, matchedCount, withoutFileName };
}
