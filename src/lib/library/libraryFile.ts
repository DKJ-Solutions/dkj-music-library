// DE BIBLIOTHEEK IN GIT: een tekst-export naast de database, zodat elke kloon van de repo hem heeft.
//
// data/library/library.db blijft lokaal en git-ignored: een binair SQLite-bestand valt in git niet te
// vergelijken of samen te voegen. Wat wél in git staat, is data/library/export/:
//   - tracks.ndjson             één regel per nummer (dkj_track_id, created_at, updated_at + fields.ts),
//                               gesorteerd op dkj_track_id
//   - spotify_track_ids.ndjson  de koppeltabel uit trackIds.ts, gesorteerd op dkj_track_id en Spotify-ID
//   - artists.ndjson            de artiesten uit artistIds.ts, gesorteerd op dkj_artist_id (ontbreekt in
//                               een export van vóór de artiest-ID's; dan is de tabel gewoon leeg)
// Eén rij per regel en een vaste volgorde, dus een diff laat precies zien wat er veranderde.
//
// DE EXPORT IS DE BRON, DE DATABASE IS EEN KOPIE. openLibrary() vergelijkt bij het openen de hash
// van de export met de hash die de database de laatste keer schreef of las (tabel library_meta):
//   - verschillen ze (verse kloon, of een `git pull` met nieuwe data), dan wordt de database uit de
//     export opnieuw opgebouwd;
//   - is er nog geen export maar wel data, dan wordt de export nu geschreven.
// Dat is veilig omdat elke schrijvende stap via withLibrary() loopt, die direct daarna exporteert.
// En voor het geval dat misgaat (een crash, een volle schijf, of het tweede bestand dat niet
// geschreven wordt terwijl het eerste al wel nieuw is): vóór het schrijven zet withLibrary() de hash
// op "pending", en pas een geslaagde export zet de echte hash terug. Een database die op "pending"
// staat, is nieuwer dan de export -- die wordt dan opnieuw geëxporteerd, nooit overschreven.
//
// Eén schrijver tegelijk: twee processen die tegelijk exporteren (de dev-server en een script)
// wachten op elkaars database-lock (busy_timeout in db.ts), maar kunnen elkaars export-bestanden
// overschrijven. Draai een script dus niet terwijl er een sync op /spotify loopt.
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
import { ARTISTS_TABLE, ensureArtistsTable } from "./artistIds";
import { LEGACY_TRACK_ID_KEY, TRACK_FIELDS, TRACK_ID_KEY, type FieldDef } from "./fields";
import { SPOTIFY_LINK_TABLE, ensureSpotifyLinkTable } from "./trackIds";
import { countTracks, listTracks, toSqlValue, type TrackValue } from "./trackStore";

const DEFAULT_EXPORT_DIR = path.join(process.cwd(), "data", "library", "export");
const TRACKS_FILE = "tracks.ndjson";
const LINKS_FILE = "spotify_track_ids.ndjson";
const ARTISTS_FILE = "artists.ndjson";
const META_TABLE = "library_meta";
const HASH_KEY = "export_hash";
/** Staat als hash in library_meta zolang de database wijzigingen heeft die nog niet geëxporteerd zijn. */
const PENDING = "pending";

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
  const required = [TRACKS_FILE, LINKS_FILE].map((name) => path.join(dir, name));
  if (!required.every((file) => fs.existsSync(file))) return null;
  const artists = path.join(dir, ARTISTS_FILE);
  const files = fs.existsSync(artists) ? [...required, artists] : required;
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

/** Markeert de database als nieuwer dan de export (zie de kop van dit bestand). */
function markPending(db: DatabaseSync): void {
  ensureMetaTable(db);
  writeHash(db, PENDING);
}

/** Schrijft de tabellen naar `dir` en onthoudt de hash in de database. Geeft de hash terug. */
export function exportLibrary(
  db: DatabaseSync,
  dir: string = getLibraryExportDir(),
  fields: readonly FieldDef[] = TRACK_FIELDS
): string {
  ensureSpotifyLinkTable(db);
  ensureArtistsTable(db);
  markPending(db);
  fs.mkdirSync(dir, { recursive: true });

  // Vaste sleutelvolgorde: systeemkolommen, dan fields.ts. Zo blijft een regel gelijk zolang de data
  // gelijk is.
  const tracks = listTracks(db, fields).map((track) => {
    const line: Record<string, TrackValue> = {
      [TRACK_ID_KEY]: track.dkj_track_id,
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
  const artists = db
    .prepare(`SELECT dkj_artist_id, spotify_artist_id, name, created_at FROM ${ARTISTS_TABLE} ORDER BY dkj_artist_id`)
    .all()
    .map((row) => ({ ...row }));

  writeAtomic(path.join(dir, TRACKS_FILE), toLines(tracks));
  writeAtomic(path.join(dir, LINKS_FILE), toLines(links));
  writeAtomic(path.join(dir, ARTISTS_FILE), toLines(artists));

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

function requireText(row: Record<string, unknown>, key: string, where: string): string {
  const value = row[key];
  if (typeof value !== "string" || value === "") throw new Error(`${where}: "${key}" ontbreekt of is geen tekst`);
  return value;
}

/** Vervangt de inhoud van de tabellen door de export in `dir`, in één transactie. */
export function restoreLibrary(
  db: DatabaseSync,
  dir: string = getLibraryExportDir(),
  fields: readonly FieldDef[] = TRACK_FIELDS
): { tracks: number; links: number; artists: number } {
  const hash = exportHash(dir);
  if (!hash) throw new Error(`geen volledige export in ${dir}`);
  ensureSpotifyLinkTable(db);
  ensureArtistsTable(db);
  ensureMetaTable(db);

  // Een export van vóór de hernoeming heeft `track_id` in plaats van `dkj_track_id`.
  const withTrackId = (row: Record<string, unknown>) =>
    TRACK_ID_KEY in row || !(LEGACY_TRACK_ID_KEY in row) ? row : { ...row, [TRACK_ID_KEY]: row[LEGACY_TRACK_ID_KEY] };
  const tracks = readLines(path.join(dir, TRACKS_FILE)).map(withTrackId);
  const links = readLines(path.join(dir, LINKS_FILE)).map(withTrackId);
  const artistsFile = path.join(dir, ARTISTS_FILE);
  const artists = fs.existsSync(artistsFile) ? readLines(artistsFile) : [];
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
  const insertArtist = db.prepare(
    `INSERT INTO ${ARTISTS_TABLE} (dkj_artist_id, spotify_artist_id, name, created_at) VALUES (?, ?, ?, ?)`
  );

  db.exec("BEGIN");
  try {
    db.exec(`DELETE FROM ${TRACKS_TABLE}`);
    db.exec(`DELETE FROM ${SPOTIFY_LINK_TABLE}`);
    db.exec(`DELETE FROM ${ARTISTS_TABLE}`);
    tracks.forEach((track, index) => {
      const where = `${TRACKS_FILE} regel ${index + 1}`;
      const values: SQLInputValue[] = [
        requireText(track, TRACK_ID_KEY, where),
        requireText(track, "created_at", where),
        requireText(track, "updated_at", where),
        ...known.map((field) => toSqlValue(field, track[field.key] as TrackValue | undefined)),
      ];
      insertTrack.run(...values);
    });
    links.forEach((link, index) => {
      const where = `${LINKS_FILE} regel ${index + 1}`;
      insertLink.run(
        requireText(link, "spotify_track_id", where),
        requireText(link, TRACK_ID_KEY, where),
        requireText(link, "song_key", where)
      );
    });
    artists.forEach((artist, index) => {
      const where = `${ARTISTS_FILE} regel ${index + 1}`;
      insertArtist.run(
        requireText(artist, "dkj_artist_id", where),
        requireText(artist, "spotify_artist_id", where),
        requireText(artist, "name", where),
        requireText(artist, "created_at", where)
      );
    });
    writeHash(db, hash);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return { tracks: tracks.length, links: links.length, artists: artists.length };
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
  const stored = readHash(db);
  if (stored === PENDING) {
    exportLibrary(db, dir, fields);
    return "exported";
  }
  const onDisk = exportHash(dir);
  if (onDisk) {
    if (onDisk === stored) return "in-sync";
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
    markPending(db);
    const result = work(db);
    exportLibrary(db, dir);
    return result;
  } finally {
    db.close();
  }
}
