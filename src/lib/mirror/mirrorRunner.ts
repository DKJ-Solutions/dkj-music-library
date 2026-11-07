// Het draaien van de desktop-mirror (#145): eerst een dry run die toont wat er gekopieerd en wat er op de
// reserve VERWIJDERD wordt, dan pas, na een bevestiging, de echte spiegel.
//
// De echte run spiegelt alleen wat je net hebt goedgekeurd. Hij krijgt de vingerafdruk van die dry run mee,
// doet vlak ervoor een verse dry run, en weigert als die iets anders zou doen (er is intussen iets veranderd op
// een van beide schijven). Verder weigert hij zolang rekordbox draait (de bibliotheek is dan halverwege een
// schrijfactie), als een schijf ontbreekt, als de paden elkaar raken, en als een bestand op de reserve nieuwer is
// dan op de werkschijf: dat is een teken dat er op de reserve is gewerkt, en de spiegel zou dat werk weggooien.
//
// SERVER-ONLY. De app draait als één lokale server, dus de toestand (de laatste dry run, een lopende spiegel)
// staat in het geheugen van dat proces -- op globalThis, zodat elke route dezelfde ziet.
import { spawn, execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { readMirrorConfig, writeMirrorState, type MirrorConfig } from "./mirrorConfig";
import { buildRobocopyArgs, parseRobocopyLog, pathProblem, planDigest, type MirrorEntry, type MirrorPlan } from "./robocopyPlan";

/** Zo lang blijft een goedgekeurde dry run geldig. */
export const PLAN_MAX_AGE_MS = 15 * 60 * 1000;
/** Zoveel regels per lijst gaan mee naar de pagina; de aantallen kloppen altijd. */
export const LIST_LIMIT = 500;

export interface MirrorDeps {
  platform: NodeJS.Platform;
  exists: (p: string) => boolean;
  isRekordboxRunning: () => Promise<boolean>;
  /** Draait robocopy met deze argumenten en levert de exitcode. */
  runRobocopy: (args: string[]) => Promise<number>;
  readLog: (logPath: string) => string;
  newLogPath: () => string;
  now: () => Date;
}

export const realDeps: MirrorDeps = {
  platform: process.platform,
  exists: (p) => fs.existsSync(p),
  isRekordboxRunning: () =>
    new Promise((resolve) => {
      execFile("tasklist", ["/FI", "IMAGENAME eq rekordbox.exe", "/NH", "/FO", "CSV"], { windowsHide: true }, (err, stdout) =>
        // Kan tasklist niet draaien, dan weten we het niet: liever weigeren dan een open bibliotheek spiegelen.
        resolve(err ? true : /rekordbox\.exe/i.test(stdout))
      );
    }),
  runRobocopy: (args) =>
    new Promise((resolve, reject) => {
      const child = spawn("robocopy", args, { windowsHide: true, stdio: "ignore" });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 16));
    }),
  readLog: (logPath) => {
    const text = fs.readFileSync(logPath).toString("utf16le").replace(/^﻿/, "");
    fs.rmSync(logPath, { force: true });
    return text;
  },
  newLogPath: () => path.join(os.tmpdir(), `dkj-mirror-${process.pid}-${Date.now()}.log`),
  now: () => new Date(),
};

export interface MirrorSummary {
  digest: string;
  createdAt: string;
  working: string;
  reserve: string;
  counts: { copies: number; deletions: number; reserveNewer: number };
  copies: MirrorEntry[];
  deletions: MirrorEntry[];
  reserveNewer: MirrorEntry[];
}

export interface MirrorRunStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  /** "ok" of de reden waarom het mislukte, null zolang er niets gedraaid heeft. */
  result: string | null;
}

interface MirrorMemory {
  lastPlan: { digest: string; config: MirrorConfig; at: number } | null;
  run: MirrorRunStatus;
}

const KEY = Symbol.for("dkj-music-library.mirror");
function memory(): MirrorMemory {
  const g = globalThis as unknown as Record<symbol, MirrorMemory | undefined>;
  return (g[KEY] ??= { lastPlan: null, run: { running: false, startedAt: null, finishedAt: null, result: null } });
}

/** Alleen voor tests: begin met een schone toestand. */
export function resetMirrorMemory(): void {
  const g = globalThis as unknown as Record<symbol, MirrorMemory | undefined>;
  delete g[KEY];
}

export class MirrorRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MirrorRefusal";
  }
}

export function getMirrorRunStatus(): MirrorRunStatus {
  return { ...memory().run };
}

/** Alles wat vóór een dry run of een spiegel al moet kloppen. Gooit MirrorRefusal met de reden. */
async function preflight(config: MirrorConfig | null, deps: MirrorDeps): Promise<MirrorConfig> {
  if (deps.platform !== "win32") throw new MirrorRefusal("De spiegel gebruikt robocopy en draait alleen op Windows.");
  if (!config) throw new MirrorRefusal("Nog geen schijven ingesteld: zet ze in data/mirror/config.json (zie mirror-config.example.json).");
  const problem = pathProblem(config.working, config.reserve);
  if (problem) throw new MirrorRefusal(problem);
  if (!deps.exists(config.working)) throw new MirrorRefusal(`De werkschijf ${config.working} is niet aangesloten.`);
  if (!deps.exists(config.reserve)) throw new MirrorRefusal(`De reserveschijf ${config.reserve} is niet aangesloten.`);
  if (memory().run.running) throw new MirrorRefusal("Er loopt al een spiegel.");
  if (await deps.isRekordboxRunning()) throw new MirrorRefusal("rekordbox draait nog: sluit het eerst, anders spiegel je een bibliotheek die halverwege een schrijfactie kan zijn.");
  return config;
}

async function plan(config: MirrorConfig, deps: MirrorDeps): Promise<MirrorPlan> {
  const logPath = deps.newLogPath();
  const code = await deps.runRobocopy(buildRobocopyArgs(config.working, config.reserve, { dryRun: true, logPath }));
  const log = deps.readLog(logPath);
  if (code >= 8) throw new Error(`robocopy gaf exitcode ${code} bij de dry run`);
  return parseRobocopyLog(log);
}

function summarize(p: MirrorPlan, config: MirrorConfig, digest: string, at: Date): MirrorSummary {
  return {
    digest,
    createdAt: at.toISOString(),
    working: config.working,
    reserve: config.reserve,
    counts: { copies: p.copies.length, deletions: p.deletions.length, reserveNewer: p.reserveNewer.length },
    copies: p.copies.slice(0, LIST_LIMIT),
    deletions: p.deletions.slice(0, LIST_LIMIT),
    reserveNewer: p.reserveNewer.slice(0, LIST_LIMIT),
  };
}

/** De dry run: raakt de reserve niet aan. Onthoudt de vingerafdruk, zodat startMirror alleen deze kan uitvoeren. */
export async function dryRunMirror(deps: MirrorDeps = realDeps, config = readMirrorConfig()): Promise<MirrorSummary> {
  const checked = await preflight(config, deps);
  const p = await plan(checked, deps);
  const digest = planDigest(p);
  const at = deps.now();
  memory().lastPlan = { digest, config: checked, at: at.getTime() };
  return summarize(p, checked, digest, at);
}

/** Start de echte spiegel van de goedgekeurde dry run `digest`. Wacht op de verse dry run en de controles, en
 *  geeft terug zodra robocopy loopt; het einde staat daarna in getMirrorRunStatus(). */
export async function startMirror(digest: string, deps: MirrorDeps = realDeps, config = readMirrorConfig()): Promise<void> {
  const approved = memory().lastPlan;
  if (!approved || approved.digest !== digest) throw new MirrorRefusal("Deze dry run is niet (meer) de laatste: doe eerst een nieuwe dry run.");
  if (deps.now().getTime() - approved.at > PLAN_MAX_AGE_MS) throw new MirrorRefusal("De dry run is ouder dan een kwartier: doe hem opnieuw.");
  const checked = await preflight(config, deps);
  if (checked.working !== approved.config.working || checked.reserve !== approved.config.reserve) {
    throw new MirrorRefusal("De ingestelde schijven zijn veranderd sinds de dry run: doe hem opnieuw.");
  }
  const fresh = await plan(checked, deps);
  if (fresh.reserveNewer.length > 0) {
    throw new MirrorRefusal(`${fresh.reserveNewer.length} bestand(en) zijn op de reserve nieuwer dan op de werkschijf: er is op de reserve gewerkt. Zet dat eerst terug op de werkschijf.`);
  }
  if (planDigest(fresh) !== digest) throw new MirrorRefusal("Er is iets veranderd op een van de schijven sinds de dry run: kijk opnieuw.");

  const mem = memory();
  mem.lastPlan = null;
  mem.run = { running: true, startedAt: deps.now().toISOString(), finishedAt: null, result: null };
  const logPath = deps.newLogPath();
  void deps
    .runRobocopy(buildRobocopyArgs(checked.working, checked.reserve, { dryRun: false, logPath }))
    .then((code) => {
      try {
        deps.readLog(logPath);
      } catch {
        // Het log is alleen voor de dry run nodig; een ontbrekend log maakt de spiegel niet mislukt.
      }
      const finishedAt = deps.now().toISOString();
      if (code < 8) {
        writeMirrorState({ lastSuccessAt: finishedAt });
        mem.run = { ...mem.run, running: false, finishedAt, result: "ok" };
      } else {
        mem.run = { ...mem.run, running: false, finishedAt, result: `robocopy gaf exitcode ${code}: niet alles is gespiegeld. Kijk in de serverconsole en doe een nieuwe dry run.` };
        console.error(`[mirror] robocopy eindigde met exitcode ${code}`);
      }
    })
    .catch((err: unknown) => {
      mem.run = { ...mem.run, running: false, finishedAt: deps.now().toISOString(), result: `robocopy kon niet starten: ${err instanceof Error ? err.message : String(err)}` };
    });
}
