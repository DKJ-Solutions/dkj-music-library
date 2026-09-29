// WAT ER IN DE EXPORT VERANDERD IS, in één zin: voor het changelog-item dat `npm run library:publish`
// (scripts/library/publish-library.ps1) schrijft als je iets in de app hebt aangepast, bv. een tier.
//
// Vergelijkt twee versies van tracks.ndjson per dkj_track_id. `updated_at` telt niet mee: die verandert
// bij elke schrijfactie en zegt niets over wát er veranderde.
//
// Pure module: geen fs, geen git -- de aanroeper levert de twee teksten.
import { TRACK_ID_KEY } from "./fields";

export interface ExportDiff {
  /** Tracks die in beide versies staan en waarvan minstens één veld anders is. */
  changed: number;
  added: number;
  removed: number;
  /** Per veld: bij hoeveel gewijzigde tracks het anders is. */
  fields: Record<string, number>;
}

function parse(text: string): Map<string, Record<string, unknown>> {
  const tracks = new Map<string, Record<string, unknown>>();
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const track = JSON.parse(line) as Record<string, unknown>;
    tracks.set(String(track[TRACK_ID_KEY]), track);
  }
  return tracks;
}

export function diffExports(before: string, after: string): ExportDiff {
  const old = parse(before);
  const next = parse(after);
  const diff: ExportDiff = { changed: 0, added: 0, removed: 0, fields: {} };
  for (const id of old.keys()) if (!next.has(id)) diff.removed++;
  for (const [id, track] of next) {
    const prev = old.get(id);
    if (!prev) {
      diff.added++;
      continue;
    }
    const keys = new Set([...Object.keys(prev), ...Object.keys(track)]);
    let changed = false;
    for (const key of keys) {
      if (key === "updated_at") continue;
      if (JSON.stringify(prev[key] ?? null) === JSON.stringify(track[key] ?? null)) continue;
      diff.fields[key] = (diff.fields[key] ?? 0) + 1;
      changed = true;
    }
    if (changed) diff.changed++;
  }
  return diff;
}

/** "2 tracks gewijzigd (dkj_rating 2)"; leeg als er niets veranderde. */
export function describeDiff(diff: ExportDiff): string {
  const parts: string[] = [];
  if (diff.changed > 0) {
    const fields = Object.entries(diff.fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, n]) => `${key} ${n}`)
      .join(", ");
    parts.push(`${diff.changed} ${diff.changed === 1 ? "track" : "tracks"} gewijzigd (${fields})`);
  }
  if (diff.added > 0) parts.push(`${diff.added} toegevoegd`);
  if (diff.removed > 0) parts.push(`${diff.removed} weggehaald`);
  return parts.join(", ");
}
