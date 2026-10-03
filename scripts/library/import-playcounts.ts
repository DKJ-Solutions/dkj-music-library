// Vult `spotify_playcount` uit je Extended streaming history (issue #74; wat als een play telt staat in
// src/lib/library/playcounts.ts):
//
//   npm run library:playcounts                         -- leest data/spotify/streaming-history/
//   npm run library:playcounts -- --dir <map>          -- een andere map
//   npm run library:playcounts -- --min-seconds 0      -- elke regel telt, ook een wegklik na 2 seconden
//
// De history vraag je aan bij Spotify (Privacy-instellingen, "Extended streaming history"); je krijgt
// een zip. Pak die uit in data/spotify/streaming-history/ -- die map valt buiten git. Het script zoekt
// daar (ook in submappen) naar elk `Streaming_History_Audio_*.json`; de video-bestanden doen niet mee.
//
// Elke run telt alles opnieuw en overschrijft de vorige aantallen, dus met een nieuwere export draai je
// dit gewoon nog een keer. Daarna staat het resultaat in de export: commit data/library/export/.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { withLibrary } from "../../src/lib/library/libraryFile";
import { MIN_PLAY_MS, applyPlaycounts, countPlays, type StreamingHistoryEntry } from "../../src/lib/library/playcounts";

const DEFAULT_DIR = join("data", "spotify", "streaming-history");
const HISTORY_FILE = /^Streaming_History_Audio_.*\.json$/;

function parseArgs(argv: string[]): { dir: string; minMs: number } {
  let dir = DEFAULT_DIR;
  let minMs = MIN_PLAY_MS;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") dir = argv[++i] ?? dir;
    else if (argv[i] === "--min-seconds") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 0) throw new Error("--min-seconds verwacht een getal van 0 of meer");
      minMs = value * 1000;
    }
  }
  return { dir, minMs };
}

/** Alle history-bestanden onder `dir`, ook in submappen (de zip pakt uit in een eigen map). */
function findHistoryFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...findHistoryFiles(path));
    else if (HISTORY_FILE.test(name)) found.push(path);
  }
  return found.sort();
}

function readEntries(file: string): StreamingHistoryEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file} is geen lijst met regels`);
  return parsed as StreamingHistoryEntry[];
}

try {
  const { dir, minMs } = parseArgs(process.argv.slice(2));
  let files: string[];
  try {
    files = findHistoryFiles(dir);
  } catch {
    throw new Error(`map ${dir} niet gevonden -- pak de zip van Spotify daar uit`);
  }
  if (files.length === 0) throw new Error(`geen Streaming_History_Audio_*.json in ${dir}`);

  const entries = files.flatMap(readEntries);
  const plays = countPlays(entries, minMs);
  const total = [...plays.values()].reduce((sum, n) => sum + n, 0);
  console.log(
    `${files.length} bestand(en), ${entries.length} regels, ${total} plays van ${minMs / 1000} seconden of langer, ` +
      `over ${plays.size} Spotify-tracks:`
  );
  for (const file of files) console.log(`  ${relative(dir, file)}`);

  const result = withLibrary((db) => applyPlaycounts(db, plays));
  console.log(
    `Klaar: ${result.played} tracks met plays, ${result.changed} aantallen veranderd, ` +
      `${result.unmatchedPlays} plays van tracks die niet in de bibliotheek staan. Commit data/library/export/.`
  );
} catch (err) {
  console.error(`Playcounts importeren mislukt: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
