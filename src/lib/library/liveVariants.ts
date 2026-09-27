// LIVE-VARIANTEN SAMENVOEGEN in een bibliotheek die ze al heeft (de regel staat in liveTitle.ts).
//
// Sinds 27 september 2026 vallen een live-opname en de studioversie op één nummer-sleutel samen
// (songKey() in trackIds.ts), dus een nieuwe live-track krijgt vanzelf het ID van zijn studioversie.
// Wat daarvóór al in de bibliotheek stond, zet mergeLiveVariants() één keer recht:
//
//   - Nummers die na het weglaten van live dezelfde sleutel hebben, worden één rij. De studio-rij blijft
//     (met zijn titel en Spotify-gegevens); zonder studio-rij blijft de rij met het laagste ID. Een veld
//     dat bij de blijvende rij leeg is, neemt de waarde van een weggevallen rij over. De playlists en
//     groepen worden samengevoegd.
//   - De blijvende rij krijgt het LAAGSTE ID van de groep (Dave, 27 september 2026): You Shook Me All
//     Night Long wordt ACD01-02, niet ACD01-38. Dat is een bewuste, eenmalige uitzondering op "een ID
//     verandert niet meer". Het vrijgekomen ID wordt later gewoon weer uitgedeeld.
//   - Een rij die alleen een live-titel heeft, krijgt de schone titel. `dkj_file` en `dkj_artist` gaan
//     mee, maar alleen als ze nog de afgeleide waarde van de oude titel hadden: wat je zelf invulde,
//     blijft staan.
//   - De koppeltabel krijgt de nieuwe sleutels en ID's.
//
// Een tweede keer doet niets: er staat dan geen live-titel en geen live-sleutel meer in.
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { TRACKS_TABLE } from "./db";
import { FILE_KEY, GROUP_KEY, PLAYLISTS_KEY, PRIMARY_ARTIST_KEY, TRACK_FIELDS, TRACK_ID_KEY } from "./fields";
import { fileNameOf } from "./fileName";
import { isLiveTitle, studioTitleOf } from "./liveTitle";
import { primaryArtistOf } from "./primaryArtist";
import { SPOTIFY_LINK_TABLE, compareTrackIds, ensureSpotifyLinkTable, trackIdPrefix } from "./trackIds";

type Row = Record<string, SQLInputValue>;

/** Een oude nummer-sleutel ("titel|artiesten") met de titel zonder live-aanduiding. */
export function studioSongKey(key: string): string {
  const at = key.lastIndexOf("|");
  return `${studioTitleOf(key.slice(0, at)).toLowerCase()}${key.slice(at)}`;
}

function parseList(value: SQLInputValue): unknown[] {
  try {
    const list = typeof value === "string" ? (JSON.parse(value) as unknown) : null;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Voegt JSON-lijsten samen zonder dubbelen (een playlist op id), in volgorde van voorkomen. */
function unionLists(values: SQLInputValue[]): string | null {
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const item of values.flatMap(parseList)) {
    const key = item && typeof item === "object" && "id" in item ? String(item.id) : JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.length > 0 ? JSON.stringify(merged) : null;
}

const titleOf = (row: Row) => (typeof row.title === "string" ? row.title : "");

/** De blijvende rij met zijn velden: die van de studio-rij, aangevuld uit de andere rijen. */
function mergeRows(rows: Row[]): Row {
  const ordered = [...rows].sort((a, b) => compareTrackIds(String(a[TRACK_ID_KEY]), String(b[TRACK_ID_KEY])));
  const survivor = ordered.find((row) => !isLiveTitle(titleOf(row))) ?? ordered[0];
  const others = ordered.filter((row) => row !== survivor);
  const merged: Row = { ...survivor };
  for (const { key } of TRACK_FIELDS) {
    if (key === PLAYLISTS_KEY || key === GROUP_KEY) {
      merged[key] = unionLists([survivor, ...others].map((row) => row[key] ?? null));
    } else if (merged[key] === null || merged[key] === undefined) {
      merged[key] = others.find((row) => row[key] !== null && row[key] !== undefined)?.[key] ?? null;
    }
  }
  return merged;
}

/** Zet de titel schoon, en `dkj_file`/`dkj_artist` mee als die nog van de oude titel afgeleid waren. */
function retitle(row: Row): Row {
  const title = titleOf(row);
  const clean = studioTitleOf(title);
  if (clean === title.trim()) return row;
  const artists = parseList(row.artists ?? null).filter((name): name is string => typeof name === "string");
  const next: Row = { ...row, title: clean };
  if (row[FILE_KEY] === fileNameOf(title, artists)) next[FILE_KEY] = fileNameOf(clean, artists);
  if (row[PRIMARY_ARTIST_KEY] === primaryArtistOf(title, artists)) next[PRIMARY_ARTIST_KEY] = primaryArtistOf(clean, artists);
  return next;
}

export interface LiveMergeResult {
  /** Rijen die in een studioversie (of een andere live-rij) opgingen en dus verdwenen. */
  merged: number;
  /** Rijen die een schone titel kregen. */
  retitled: number;
}

/** Voegt live-varianten samen met hun studioversie, in één transactie. Zie het commentaar bovenaan. */
export function mergeLiveVariants(db: DatabaseSync): LiveMergeResult {
  ensureSpotifyLinkTable(db);
  const links = db.prepare(`SELECT spotify_track_id, ${TRACK_ID_KEY}, song_key FROM ${SPOTIFY_LINK_TABLE}`).all() as {
    spotify_track_id: string;
    dkj_track_id: string;
    song_key: string;
  }[];
  const rows = new Map(
    (db.prepare(`SELECT * FROM ${TRACKS_TABLE}`).all() as Row[]).map((row) => [String(row[TRACK_ID_KEY]), row])
  );

  // Groepen: ID's die na het weglaten van live een sleutel delen (een ID met twee sleutels verbindt ze).
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const up = parent.get(id) ?? id;
    if (up === id) return id;
    const root = find(up);
    parent.set(id, root);
    return root;
  };
  const byKey = new Map<string, string>();
  for (const link of links) {
    const key = studioSongKey(link.song_key);
    const other = byKey.get(key);
    if (other === undefined) byKey.set(key, link.dkj_track_id);
    else if (find(other) !== find(link.dkj_track_id)) parent.set(find(link.dkj_track_id), find(other));
  }
  const groups = new Map<string, string[]>();
  for (const id of rows.keys()) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }

  const now = new Date().toISOString();
  const columns = TRACK_FIELDS.map((field) => field.key);
  const updateRow = db.prepare(
    `UPDATE ${TRACKS_TABLE} SET ${columns.map((c) => `"${c}" = ?`).join(", ")}, updated_at = ? WHERE ${TRACK_ID_KEY} = ?`
  );
  const deleteRow = db.prepare(`DELETE FROM ${TRACKS_TABLE} WHERE ${TRACK_ID_KEY} = ?`);
  const renameRow = db.prepare(`UPDATE ${TRACKS_TABLE} SET ${TRACK_ID_KEY} = ? WHERE ${TRACK_ID_KEY} = ?`);
  const relink = db.prepare(`UPDATE ${SPOTIFY_LINK_TABLE} SET ${TRACK_ID_KEY} = ?, song_key = ? WHERE spotify_track_id = ?`);

  const result: LiveMergeResult = { merged: 0, retitled: 0 };
  const newIdOf = new Map<string, string>();
  db.exec("BEGIN");
  try {
    for (const ids of groups.values()) {
      const group = ids.map((id) => rows.get(id)!);
      const merged = mergeRows(group);
      const next = retitle(merged);
      const survivorId = String(merged[TRACK_ID_KEY]);
      // Het laagste ID met hetzelfde artiest-deel: zo blijft het ID bij `dkj_artist_ids` passen.
      const targetId = ids
        .filter((id) => trackIdPrefix(id) === trackIdPrefix(survivorId))
        .sort(compareTrackIds)[0];
      for (const id of ids) newIdOf.set(id, targetId);

      const changed = group.length > 1 || next.title !== merged.title;
      if (!changed) continue;
      for (const id of ids) if (id !== survivorId) deleteRow.run(id);
      updateRow.run(...columns.map((c) => next[c] ?? null), now, survivorId);
      if (targetId !== survivorId) renameRow.run(targetId, survivorId);
      result.merged += group.length - 1;
      if (next.title !== merged.title) result.retitled++;
    }
    for (const link of links) {
      const key = studioSongKey(link.song_key);
      const id = newIdOf.get(link.dkj_track_id) ?? link.dkj_track_id;
      if (key !== link.song_key || id !== link.dkj_track_id) relink.run(id, key, link.spotify_track_id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return result;
}
