// Leest een importbestand (CSV of JSON) als lijst track-records voor upsertTracks() (trackStore.ts).
//
//   - CSV:  de kopregel zijn de veldnamen uit fields.ts (plus `dkj_track_id`). Een lege cel betekent
//           "niet bekend" en laat de bestaande waarde in de database staan.
//   - JSON: een lijst objecten, of { "tracks": [...] }. Hier betekent `null` wél "maak leeg".
//
// SERVER-ONLY: gebruikt Node's `fs`.
import fs from "fs";
import path from "path";
import { parseCsvRecords } from "./csv";
import type { TrackValue } from "./trackStore";

export type ImportRecord = Record<string, TrackValue | undefined>;

export function parseImportText(text: string, format: "csv" | "json"): ImportRecord[] {
  if (format === "csv") {
    return parseCsvRecords(text).map((record) => {
      const out: ImportRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (value.trim() !== "") out[key] = value;
      }
      return out;
    });
  }

  const parsed: unknown = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  const list =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { tracks?: unknown }).tracks)
        ? (parsed as { tracks: unknown[] }).tracks
        : null;
  if (!list) throw new Error('JSON moet een lijst tracks zijn, of een object met "tracks": [...]');
  return list.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`JSON-item ${index + 1} is geen object`);
    }
    return item as ImportRecord;
  });
}

export function readImportFile(filePath: string): ImportRecord[] {
  const ext = path.extname(filePath).toLowerCase();
  const format = ext === ".json" ? "json" : ext === ".csv" || ext === ".tsv" || ext === ".txt" ? "csv" : null;
  if (!format) throw new Error(`onbekend bestandstype "${ext}" -- gebruik .csv of .json`);
  return parseImportText(fs.readFileSync(filePath, "utf8"), format);
}
