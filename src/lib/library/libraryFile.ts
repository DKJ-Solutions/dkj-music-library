// DE BIBLIOTHEEK IN GIT: een tekst-export naast de database, zodat elke kloon van de repo hem heeft.
//
// data/library/library.db blijft lokaal en git-ignored: een binair SQLite-bestand valt in git niet te
// vergelijken of samen te voegen. Wat wél in git staat, is data/library/export/:
//   - tracks.ndjson             één regel per nummer (track_id, created_at, updated_at + fields.ts),
//                               gesorteerd op track_id
//   - spotify_track_ids.ndjson  de koppeltabel uit trackIds.ts, gesorteerd op track_id en Spotify-ID
// Eén rij per regel en een vaste volgorde, dus een diff laat precies zien wat er veranderde.
//
// DE EXPORT IS DE BRON, DE DATABASE IS EEN KOPIE. openLibrary() vergelijkt bij het openen de hash
// van de export met de hash die de database de laatste keer schreef of las (tabel library_meta):
//   - verschillen ze (verse kloon, of een `git pull` met nieuwe data), dan wordt de database uit de
//     export opnieuw opgebouwd;
//   - is er nog geen export maar wel data, dan wordt de export nu geschreven.
// Dat is veilig omdat elke schrijvende stap via withLibrary() loopt, die direct daarna exporteert:
// de database heeft dus nooit wijzigingen die de export mist. Mislukt het exporteren, dan blijft de
// oude hash staan en schrijft de volgende run de export alsnog.
//
// Wat NIET meegaat: kolommen die wel in de database staan maar niet (meer) in fields.ts. Die gebruikt
// de app niet, en op een verse kloon bestaan ze niet.
//
// SERVER-ONLY: gebruikt Node's `fs` en `node:sqlite`.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { TRACKS_TABLE, openLibraryDb } from "./db";
import { TRACK_FIELDS, TRACK_ID_KEY, type FieldDef } from "./fields";
import { SPOTIFY_LINK_TABLE, ensureSpotifyLinkTable } from "./trackIds";
import { countTracks, listTracks, toSqlValue, type TrackValue } from "./trackStore";

const DEFAULT_EXPORT_DIR = path.join(process.cwd(), "data", "library", "export");
const TRACKS_FILE = "tracks.ndjson";
const LINKS_FILE = "spotify_track_ids.ndjson";
const META_TABLE = "library_meta";
const HASH_KEY = "export_hash";

export function getLibraryExportDir(): string {
  const override = process.env.LIBRARY_EXPORT_DIR;
  return override ? path.resolve(override) : DEFAULT_EXPORT_DIR;
}

function ensureMetaTable(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS ${META_TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`);
}

function readHash(db: DatabaseSync): string | null {
  const row = db.prepare(`SELECT value FROM ${META_TABLE} WHERE key = ?`).get(HASH_KEY) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function writeHash(db: DatabaseSync, hash: string): void {
  db.prepare(
    `INSERT INTO ${META_TABLE} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(HASH_KEY, hash);
}

/** De hash van de export zoals hij op schijf staat, of null als er (nog) geen export is. */
export function exportHash(dir: string): string | null {
  const files = [TRACKS_FILE, LINKS_FILE].map((name) => path.join(dir, name));
  if (!files.every((file) => fs.existsSync(file))) return null;
  const hash = crypto.createHash("sha256");
  // Regeleinden gelijktrekken: git kan op Windows CRLF uitchecken, en dat is geen andere data.
  for (const file of files) hash.update(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).update("\0");
  return hash.digest("hex");
}

function toLines(rows: readonly object[]): string {
  return rows.map((row) => JSON.stringify(row) + "\n").join("");
}

function writeAtomic(file: string, content: string): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, file);
}

/** Schrijft beide tabellen naar `dir` en onthoudt de hash in de database. Geeft de hash terug. */
export function exportLibrary(
  db: DatabaseSync,
  dir: string = getLibraryExportDir(),
  fields: readonly FieldDef[] = TRACK_FIELDS
): string {
  ensureSpotifyLinkTable(db);
  ensureMetaTable(db);
  fs.mkdirSync(dir, { recursive: true });

  // Vaste sleutelvolgorde: systeemkolommen, dan fields.ts. Zo blijft een regel gelijk zolang de data
  // gelijk is.
  const tracks = listTracks(db, fields).map((track) => {
    const line: Record<string, TrackValue> = {
      [TRACK_ID_KEY]: track.track_id,
      created_at: track.created_at,
      updated_at: track.updated_at,
    };
    for (const field of fields) line[field.key] = track[field.key] ?? null;
    return line;
  });
  const links = db
    .prepare(
      `SELECT ${TRACK_ID_KEY}, spotify_track_id, song_key FROM ${SPOTIFY_LINK_TABLE} ` +
        `ORDER BY ${TRACK_ID_KEY}, spotify_track_id`
    )
    .all()
    .map((row) => ({ ...row }));

  writeAtomic(path.join(dir, TRACKS_FILE), toLines(tracks));
  writeAtomic(path.join(dir, LINKS_FILE), toLines(links));

  const hash = exportHash(dir)!;
  writeHash(db, hash);
  return hash;
}

function readLines(file: string): Record<string, unknown>[] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        throw new Error(`${path.basename(file)} regel ${index + 1} is geen geldige JSON`);
      }
    });
}

/** Vervangt de inhoud van beide tabellen door de export in `dir`, in één transactie. */
export function restoreLibrary(
  db: DatabaseSync,
  dir: string = getLibraryExportDir(),
  fields: readonly FieldDef[] = TRACK_FIELDS
): { tracks: number; links: number } {
  const hash = exportHash(dir);
  if (!hash) throw new Error(`geen volledige export in ${dir}`);
  ensureSpotifyLinkTable(db);
  ensureMetaTable(db);

  const tracks = readLines(path.join(dir, TRACKS_FILE));
  const links = readLines(path.join(dir, LINKS_FILE));
  // Alleen velden die (nog) in fields.ts staan; een veld dat intussen weg is, valt stil weg.
  const known = fields.filter((field) => tracks.some((track) => field.key in track));
  const columns = [TRACK_ID_KEY, "created_at", "updated_at", ...known.map((field) => field.key)];
  const insertTrack = db.prepare(
    `INSERT INTO ${TRACKS_TABLE} (${columns.map((c) => `"${c}"`).join(", ")}) ` +
      `VALUES (${columns.map(() => "?").join(", ")})`
  );
  const insertLink = db.prepare(
    `INSERT INTO ${SPOTIFY_LINK_TABLE} (spotify_track_id, ${TRACK_ID_KEY}, song_key) VALUES (?, ?, ?)`
  );

  db.exec("BEGIN");
  try {
    db.exec(`DELETE FROM ${TRACKS_TABLE}`);
    db.exec(`DELETE FROM ${SPOTIFY_LINK_TABLE}`);
    for (const track of tracks) {
      const values: SQLInputValue[] = [
        String(track[TRACK_ID_KEY]),
        String(track.created_at),
        String(track.updated_at),
        ...known.map((field) => toSqlValue(field, track[field.key] as TrackValue | undefined)),
      ];
      insertTrack.run(...values);
    }
    for (const link of links) {
      insertLink.run(String(link.spotify_track_id), String(link[TRACK_ID_KEY]), String(link.song_key));
    }
    writeHash(db, hash);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return { tracks: tracks.length, links: links.length };
}

/** Wat openLibrary() deed om database en export gelijk te trekken. */
export type LibrarySync = "restored" | "exported" | "in-sync" | "empty";

/** Brengt de database in lijn met de export (zie de kop van dit bestand). */
export function syncWithExport(
  db: DatabaseSync,
  dir: string = getLibraryExportDir(),
  fields: readonly FieldDef[] = TRACK_FIELDS
): LibrarySync {
  ensureMetaTable(db);
  const onDisk = exportHash(dir);
  if (onDisk) {
    if (onDisk === readHash(db)) return "in-sync";
    restoreLibrary(db, dir, fields);
    return "restored";
  }
  ensureSpotifyLinkTable(db);
  if (countTracks(db) === 0) return "empty";
  exportLibrary(db, dir, fields);
  return "exported";
}

/** Opent de database en trekt hem gelijk met de export. Gebruik dit (of withLibrary) in plaats van
 *  openLibraryDb() zodra er iets met de bibliotheek gebeurt. */
export function openLibrary(
  dbPath?: string,
  dir: string = getLibraryExportDir()
): { db: DatabaseSync; sync: LibrarySync } {
  const { db } = openLibraryDb(dbPath);
  try {
    return { db, sync: syncWithExport(db, dir) };
  } catch (err) {
    db.close();
    throw err;
  }
}

/** Opent de bibliotheek, voert `work` uit, exporteert het resultaat en sluit af. Voor elke stap die
 *  schrijft, zodat de export in git nooit achterloopt. */
export function withLibrary<T>(work: (db: DatabaseSync) => T, dbPath?: string, dir?: string): T {
  const { db } = openLibrary(dbPath, dir);
  try {
    const result = work(db);
    exportLibrary(db, dir);
    return result;
  } finally {
    db.close();
  }
}
