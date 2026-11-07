// De desktop-mirror (#145): de werkschijf met de muziek en de rekordbox-bibliotheek, één kant op gespiegeld naar
// een reserveschijf van hetzelfde type. Op de reserve wordt nooit gewerkt en er stroomt nooit iets terug.
//
// Deze module is PUUR: de argumenten voor robocopy, het lezen van wat een dry run (`/L`) zou doen, en de
// controle of de twee paden elkaar niet raken. Het draaien zelf staat in mirrorRunner.ts.
//
// Waarom robocopy /MIR: het is de spiegel die Windows zelf meebrengt, en het neemt alleen over wat verschilt.
// /MIR haalt ook weg wat op de reserve staat en op de werkschijf niet meer, en juist daarom gaat er altijd
// eerst een dry run aan vooraf die die verwijderingen toont.
import path from "path";

/** Mappen die Windows zelf op de wortel van elke schijf zet; die horen niet in de spiegel. */
export const EXCLUDED_DIRS = ["System Volume Information", "$RECYCLE.BIN"] as const;

/** De argumenten voor robocopy. `/L` alleen bij een dry run: dan wordt er niets gekopieerd of verwijderd.
 *  `/A-:SH` omdat robocopy een gespiegelde schijfwortel anders verborgen en systeem maakt; `/XJ` volgt geen
 *  junctions (die kunnen naar buiten de schijf wijzen); `/UNILOG` schrijft het log in UTF-16, zodat
 *  bestandsnamen met accenten heel blijven. */
export function buildRobocopyArgs(working: string, reserve: string, options: { dryRun: boolean; logPath: string }): string[] {
  return [
    working,
    reserve,
    "/MIR",
    ...(options.dryRun ? ["/L"] : []),
    "/XJ",
    "/A-:SH",
    "/R:1",
    "/W:1",
    "/FP",
    "/NS",
    "/NP",
    "/NJH",
    "/NJS",
    "/XD",
    ...EXCLUDED_DIRS,
    `/UNILOG:${options.logPath}`,
  ];
}

export type MirrorChangeKind = "copy" | "delete" | "reserve-newer";

export interface MirrorEntry {
  kind: MirrorChangeKind;
  /** De robocopy-klasse zoals hij in het log staat, bv. "New File" of "*EXTRA Dir". */
  label: string;
  path: string;
}

export interface MirrorPlan {
  copies: MirrorEntry[];
  deletions: MirrorEntry[];
  /** Bestanden die op de reserve NIEUWER zijn dan op de werkschijf ("Older" bij robocopy: de bron is ouder).
   *  Een teken dat er op de reserve is gewerkt: dan weigert de spiegel. */
  reserveNewer: MirrorEntry[];
}

// Wat robocopy per regel meldt. Andere regels (een ongewijzigde map met alleen een aantal, lege regels) tellen
// niet. Een map-regel heeft na de klasse nog een aantal bestanden, vóór het pad.
const LINE = /^\s*(\*EXTRA File|\*EXTRA Dir|New File|New Dir|Newer|Older|Changed|Tweaked|Modified)\s+(?:-?\d+\s+)?([A-Za-z]:\\.*|\\\\.*)$/;

const KIND: Record<string, MirrorChangeKind> = {
  "*EXTRA File": "delete",
  "*EXTRA Dir": "delete",
  "New File": "copy",
  "New Dir": "copy",
  Newer: "copy",
  Changed: "copy",
  Modified: "copy",
  Tweaked: "copy",
  Older: "reserve-newer",
};

/** Leest het log van een robocopy-run (met /FP /NS, zie buildRobocopyArgs) als plan. */
export function parseRobocopyLog(text: string): MirrorPlan {
  const plan: MirrorPlan = { copies: [], deletions: [], reserveNewer: [] };
  for (const raw of text.split(/\r?\n/)) {
    const match = LINE.exec(raw.replace(/\t/g, " "));
    if (!match) continue;
    const entry: MirrorEntry = { kind: KIND[match[1]], label: match[1], path: match[2].trim() };
    if (entry.kind === "copy") plan.copies.push(entry);
    else if (entry.kind === "delete") plan.deletions.push(entry);
    else plan.reserveNewer.push(entry);
  }
  return plan;
}

/** Een vingerafdruk van een plan: dezelfde wijzigingen geven dezelfde waarde. De echte run vergelijkt hem met
 *  die van een verse dry run, zodat er nooit iets anders gebeurt dan wat je net hebt goedgekeurd. */
export function planDigest(plan: MirrorPlan): string {
  const lines = [...plan.copies, ...plan.deletions, ...plan.reserveNewer].map((e) => `${e.label}\t${e.path}`).sort();
  // FNV-1a, 32 bits, twee keer met een ander begin: genoeg om twee plannen uit elkaar te houden, geen beveiliging.
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const c = line.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b ^ c, 0x01000193) >>> 0;
    }
    a = Math.imul(a ^ 10, 0x01000193) >>> 0;
  }
  return `${lines.length}-${a.toString(16)}-${b.toString(16)}`;
}

/** Waarom deze twee paden niet gespiegeld mogen worden, of null als ze in orde zijn. Puur: kijkt alleen naar
 *  de tekst van de paden, of ze bestaan beslist mirrorRunner.ts. */
export function pathProblem(working: string, reserve: string): string | null {
  if (!working.trim() || !reserve.trim()) return "Stel zowel de werkschijf als de reserveschijf in.";
  if (!path.win32.isAbsolute(working) || !path.win32.isAbsolute(reserve)) return "Gebruik volledige paden, bv. E:\\ en F:\\.";
  const norm = (p: string) => path.win32.resolve(p).toLowerCase().replace(/\\+$/, "") + "\\";
  const w = norm(working);
  const r = norm(reserve);
  if (w === r) return "De werkschijf en de reserveschijf zijn hetzelfde pad.";
  if (r.startsWith(w) || w.startsWith(r)) return "Het ene pad ligt binnen het andere; dan spiegelt de schijf in zichzelf.";
  return null;
}
