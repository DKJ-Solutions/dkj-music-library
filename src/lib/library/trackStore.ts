// Lezen en schrijven van tracks in de trackdatabase (db.ts). Alles gaat via de veldlijst in
// fields.ts: een kolom die daar niet in staat, wordt niet gelezen en niet geschreven.
//
// SCHRIJVEN IS AANVULLEN, NIET VERVANGEN. upsertTracks() werkt alleen de velden bij die in een rij
// staan. Een import met alleen `dkj_track_id` en `bpm` laat titel, artiesten enz. dus ongemoeid. Wie een
// veld echt wil leegmaken, geeft het mee met null (dat kan alleen vanuit JSON: een lege CSV-cel
// betekent "niet bekend" en laat de bestaande waarde staan, zie scripts/library/import-tracks.ts).
//
// SERVER-ONLY: werkt op een DatabaseSync uit db.ts.
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { TRACKS_TABLE } from "./db";
import { LEGACY_TRACK_ID_KEY, TRACK_FIELDS, TRACK_ID_KEY, type FieldDef } from "./fields";

export type TrackValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

/** Eén track: altijd een `dkj_track_id`, plus welke velden uit fields.ts er ook zijn. */
export interface TrackRecord {
  dkj_track_id: string;
  [field: string]: TrackValue | undefined;
}

export interface StoredTrack extends TrackRecord {
  created_at: string;
  updated_at: string;
}

/** Een fout in de invoer, met de rij erbij zodat een import kan zeggen wáár het misging. */
export class TrackInputError extends Error {}

const TRUE_WORDS = new Set(["1", "true", "ja", "yes", "y", "x"]);
const FALSE_WORDS = new Set(["0", "false", "nee", "no", "n", ""]);

/** Zet een invoerwaarde om naar wat er in de kolom komt. Strings (uit een CSV) worden per type
 *  geparseerd; een lege string wordt null. */
export function toSqlValue(field: FieldDef, value: TrackValue | undefined): SQLInputValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  switch (field.type) {
    case "text":
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      break;
    case "integer":
    case "real": {
      const n = typeof value === "string" ? Number(value.trim().replace(",", ".")) : value;
      if (typeof n !== "number" || !Number.isFinite(n)) break;
      if (field.type === "integer" && !Number.isInteger(n)) break;
      return n;
    }
    case "boolean":
      if (typeof value === "boolean") return value ? 1 : 0;
      if (value === 1 || value === 0) return value;
      if (typeof value === "string") {
        const word = value.trim().toLowerCase();
        if (TRUE_WORDS.has(word)) return 1;
        if (FALSE_WORDS.has(word)) return 0;
      }
      break;
    case "json":
      if (typeof value === "object") return JSON.stringify(value);
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          try {
            return JSON.stringify(JSON.parse(trimmed));
          } catch {
            break;
          }
        }
        // Handig in een spreadsheet: "Artiest A; Artiest B" wordt ["Artiest A", "Artiest B"].
        return JSON.stringify(trimmed.split(";").map((part) => part.trim()).filter(Boolean));
      }
      break;
  }
  throw new TrackInputError(
    `veld "${field.key}" verwacht ${field.type}, kreeg ${JSON.stringify(value)}`
  );
}

/** Het omgekeerde van toSqlValue: de kolomwaarde terug naar de vorm die de app gebruikt. */
export function fromSqlValue(field: FieldDef, value: unknown): TrackValue {
  if (value === null || value === undefined) return null;
  switch (field.type) {
    case "boolean":
      return Number(value) === 1;
    case "json":
      try {
        return JSON.parse(String(value)) as TrackValue;
      } catch {
        return String(value); // met de hand in de database gezet; liever tonen dan crashen
      }
    case "integer":
    case "real":
      return typeof value === "bigint" ? Number(value) : (value as number);
    default:
      return String(value);
  }
}

function rowToTrack(row: Record<string, unknown>, fields: readonly FieldDef[]): StoredTrack {
  const track: StoredTrack = {
    dkj_track_id: String(row[TRACK_ID_KEY]),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
  for (const field of fields) track[field.key] = fromSqlValue(field, row[field.key]);
  return track;
}

function validTrackId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
  if (id === "") throw new TrackInputError(`elke track heeft een ${TRACK_ID_KEY} nodig`);
  return id;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

/** Voegt tracks toe of werkt ze bij, in één transactie: faalt één rij, dan wordt er niets geschreven.
 *  Een onbekende kolom is een fout (een tikfout in een kolomkop mag niet stil wegvallen). */
export function upsertTracks(
  db: DatabaseSync,
  records: readonly Record<string, TrackValue | undefined>[],
  fields: readonly FieldDef[] = TRACK_FIELDS
): UpsertResult {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const exists = db.prepare(`SELECT 1 FROM ${TRACKS_TABLE} WHERE ${TRACK_ID_KEY} = ?`);
  const statements = new Map<string, ReturnType<DatabaseSync["prepare"]>>();
  const now = new Date().toISOString();
  const result: UpsertResult = { inserted: 0, updated: 0 };

  db.exec("BEGIN");
  try {
    records.forEach((record, index) => {
      const where = `rij ${index + 1}`;
      let id: string;
      const keys: string[] = [];
      const values: SQLInputValue[] = [];
      try {
        id = validTrackId(record[TRACK_ID_KEY] ?? record[LEGACY_TRACK_ID_KEY]);
        for (const [key, value] of Object.entries(record)) {
          if (key === TRACK_ID_KEY || key === LEGACY_TRACK_ID_KEY || value === undefined) continue;
          const field = byKey.get(key);
          if (!field) {
            throw new TrackInputError(`onbekend veld "${key}" (staat niet in fields.ts)`);
          }
          keys.push(key);
          values.push(toSqlValue(field, value));
        }
      } catch (err) {
        if (err instanceof TrackInputError) throw new TrackInputError(`${where}: ${err.message}`);
        throw err;
      }

      const signature = keys.join(",");
      let statement = statements.get(signature);
      if (!statement) {
        const columns = [TRACK_ID_KEY, "created_at", "updated_at", ...keys];
        const updates = ["updated_at = excluded.updated_at", ...keys.map((k) => `"${k}" = excluded."${k}"`)];
        statement = db.prepare(
          `INSERT INTO ${TRACKS_TABLE} (${columns.map((c) => `"${c}"`).join(", ")}) ` +
            `VALUES (${columns.map(() => "?").join(", ")}) ` +
            `ON CONFLICT(${TRACK_ID_KEY}) DO UPDATE SET ${updates.join(", ")}`
        );
        statements.set(signature, statement);
      }

      if (exists.get(id)) result.updated++;
      else result.inserted++;
      statement.run(id, now, now, ...values);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return result;
}

export function getTrack(
  db: DatabaseSync,
  trackId: string,
  fields: readonly FieldDef[] = TRACK_FIELDS
): StoredTrack | null {
  const row = db
    .prepare(`SELECT * FROM ${TRACKS_TABLE} WHERE ${TRACK_ID_KEY} = ?`)
    .get(trackId) as Record<string, unknown> | undefined;
  return row ? rowToTrack(row, fields) : null;
}

/** Alle tracks, gesorteerd op dkj_track_id. Bij ~6000 tracks is alles in één keer lezen prima. */
export function listTracks(
  db: DatabaseSync,
  fields: readonly FieldDef[] = TRACK_FIELDS
): StoredTrack[] {
  const rows = db
    .prepare(`SELECT * FROM ${TRACKS_TABLE} ORDER BY ${TRACK_ID_KEY}`)
    .all() as Record<string, unknown>[];
  return rows.map((row) => rowToTrack(row, fields));
}

export function countTracks(db: DatabaseSync): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${TRACKS_TABLE}`).get() as { n: number };
  return Number(row.n);
}

export function deleteTrack(db: DatabaseSync, trackId: string): boolean {
  const info = db.prepare(`DELETE FROM ${TRACKS_TABLE} WHERE ${TRACK_ID_KEY} = ?`).run(trackId);
  return Number(info.changes) > 0;
}
