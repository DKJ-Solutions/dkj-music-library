// Een kleine CSV-lezer voor de track-import (scripts/library/import-tracks.ts), zonder dependency.
//
// Leest wat Excel en Google Sheets wegschrijven: aanhalingstekens rond een cel, "" als aanhalingsteken
// erin, regeleinden binnen een cel, \r\n of \n, en een BOM vooraan. Het scheidingsteken wordt uit de
// kopregel geraden: een Nederlandse Excel schrijft `;`, de rest `,`.
//
// Pure module: geen fs.

export function detectDelimiter(text: string): "," | ";" | "\t" {
  const header = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (const ch of header) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch as keyof typeof counts]++;
  }
  if (counts[";"] > counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] > counts[","]) return "\t";
  return ",";
}

/** Splitst CSV-tekst in rijen van cellen. Volledig lege regels vallen weg. */
export function parseCsvRows(text: string, delimiter = detectDelimiter(text)): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error("CSV eindigt midden in een cel tussen aanhalingstekens");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Leest CSV met een kopregel als lijst objecten, kolomkop -> celwaarde (als string). */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsvRows(text);
  if (!header) return [];
  const keys = header.map((key) => key.trim());
  return rows.map((cells, index) => {
    if (cells.length > keys.length) {
      throw new Error(`CSV-rij ${index + 2} heeft ${cells.length} cellen, de kopregel ${keys.length}`);
    }
    const record: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (key !== "") record[key] = cells[i] ?? "";
    });
    return record;
  });
}
