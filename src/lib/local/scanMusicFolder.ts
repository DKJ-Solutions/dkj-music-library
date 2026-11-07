// De audiobestanden in de lokale muziekmap (#144), recursief. Alleen lezen: er wordt niets verplaatst,
// hernoemd of verwijderd. Een map die niet te lezen is (rechten, een systeemmap op de schijf) wordt
// overgeslagen in plaats van de hele scan te laten mislukken.
//
// SERVER-ONLY: gebruikt Node's `fs`.
import fs from "fs";
import path from "path";

export const AUDIO_EXTENSIONS = [".mp3", ".wav", ".aiff", ".aif", ".flac", ".m4a"] as const;

export interface LocalFile {
  /** De bestandsnaam zonder extensie: de kant die met `dkj_file` vergeleken wordt. */
  name: string;
  /** Het pad vanaf de muziekmap, met "/" ertussen. */
  relativePath: string;
}

export type ScanResult = { files: LocalFile[] } | { error: string };

export function isAudioFile(fileName: string): boolean {
  return (AUDIO_EXTENSIONS as readonly string[]).includes(path.extname(fileName).toLowerCase());
}

export function scanMusicFolder(folder: string): ScanResult {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(folder);
  } catch {
    return { error: `De map ${folder} is niet gevonden. Is de schijf aangesloten?` };
  }
  if (!stat.isDirectory()) return { error: `${folder} is geen map.` };

  const files: LocalFile[] = [];
  const pending = [folder];
  while (pending.length > 0) {
    const dir = pending.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile() && isAudioFile(entry.name)) {
        files.push({
          name: path.basename(entry.name, path.extname(entry.name)),
          relativePath: path.relative(folder, full).split(path.sep).join("/"),
        });
      }
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { files };
}
