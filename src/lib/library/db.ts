// De trackdatabase: één SQLite-bestand in data/library/library.db, lokaal en git-ignored. Wat wél in
// git staat, is de tekst-export in data/library/export/ -- die is de bron, deze database een kopie
// ervan. Open de bibliotheek daarom via openLibrary()/withLibrary() uit libraryFile.ts; die trekken
// database en export gelijk. openLibraryDb() hieronder is alleen het SQLite-deel.
//
// Gebruikt de SQLite die in Node zelf zit (`node:sqlite`, Node 22.13+), dus er is geen native
// dependency om te bouwen. Het schema komt uit fields.ts; syncSchema() brengt de tabel bij elke
// opening in lijn met die lijst, alleen toevoegend of hernoemend, nooit verwijderend.
//
// SERVER-ONLY: gebruikt Node's `fs` en `node:sqlite`, mag dus nooit vanuit een 'use client'-bestand
// geïmporteerd worden.
import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import {
  SYSTEM_COLUMNS,
  TRACK_FIELDS,
  TRACK_ID_KEY,
  validateFields,
  type FieldDef,
  type FieldType,
} from "./fields";

const DEFAULT_LIBRARY_DB_PATH = path.join(process.cwd(), "data", "library", "library.db");

export const TRACKS_TABLE = "tracks";

const SQL_TYPE: Record<FieldType, string> = {
  text: "TEXT",
  integer: "INTEGER",
  real: "REAL",
  boolean: "INTEGER",
  json: "TEXT",
};

export function getLibraryDbPath(): string {
  const override = process.env.LIBRARY_DB_PATH;
  return override ? path.resolve(override) : DEFAULT_LIBRARY_DB_PATH;
}

/** Wat syncSchema() deed, zodat een script het kan melden. */
export interface SchemaSyncReport {
  added: string[];
  renamed: { from: string; to: string }[];
  /** Kolommen in de database zonder veld in fields.ts: data die blijft staan maar niet meer gebruikt wordt. */
  orphaned: string[];
}

/** Opent (of maakt) de database en brengt het schema in lijn met `fields`. `dbPath` ":memory:" geeft
 *  een tijdelijke database, voor tests. */
export function openLibraryDb(
  dbPath: string = getLibraryDbPath(),
  fields: readonly FieldDef[] = TRACK_FIELDS
): { db: DatabaseSync; schema: SchemaSyncReport } {
  if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  const schema = syncSchema(db, fields);
  for (const column of schema.orphaned) {
    console.warn(
      `[library/db] kolom "${column}" staat in de database maar niet in fields.ts -- de data blijft ` +
        `staan, de app gebruikt hem niet`
    );
  }
  return { db, schema };
}

function columnNames(db: DatabaseSync): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${TRACKS_TABLE})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

/** Maakt de tabel als hij er nog niet is, hernoemt kolommen met `renamedFrom` en voegt ontbrekende
 *  kolommen toe. Verwijdert nooit iets. Veldnamen zijn door validateFields() al beperkt tot
 *  [a-z0-9_], dus ze kunnen veilig in de SQL staan. */
export function syncSchema(db: DatabaseSync, fields: readonly FieldDef[]): SchemaSyncReport {
  validateFields(fields);
  const report: SchemaSyncReport = { added: [], renamed: [], orphaned: [] };

  // Bewust geen STRICT-tabel: dan zou een type-wijziging in fields.ts de oude rijen breken.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TRACKS_TABLE} (
      ${TRACK_ID_KEY} TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const existing = columnNames(db);
  for (const field of fields) {
    if (existing.has(field.key)) continue;
    if (field.renamedFrom && existing.has(field.renamedFrom)) {
      db.exec(`ALTER TABLE ${TRACKS_TABLE} RENAME COLUMN "${field.renamedFrom}" TO "${field.key}"`);
      existing.delete(field.renamedFrom);
      report.renamed.push({ from: field.renamedFrom, to: field.key });
    } else {
      db.exec(`ALTER TABLE ${TRACKS_TABLE} ADD COLUMN "${field.key}" ${SQL_TYPE[field.type]}`);
      report.added.push(field.key);
    }
    existing.add(field.key);
  }

  const known = new Set<string>([...SYSTEM_COLUMNS, ...fields.map((field) => field.key)]);
  report.orphaned = [...existing].filter((column) => !known.has(column));
  return report;
}
