// De desktop-mirror (#145) zonder echte schijven: robocopy, de schijven en rekordbox zijn nep, de toestand en
// data/mirror/state.json echt (naar een tijdelijke map omgeleid).
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readMirrorState } from "./mirrorConfig";
import { dryRunMirror, getMirrorRunStatus, PLAN_MAX_AGE_MS, resetMirrorMemory, startMirror, type MirrorDeps } from "./mirrorRunner";

const CONFIG = { working: "E:\\", reserve: "F:\\" };
const COPY = "\t    New File  \t\t\tE:\\a.mp3";
const DELETE = "\t  *EXTRA File \t\t\tF:\\weg.wav";
const OLDER = "\t    Older     \t\t\tE:\\bewerkt.aiff";

let dir: string;
let log: string;
let clock: number;
let finish: (code: number) => void;
let deps: MirrorDeps;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-mirror-"));
  process.env.DKJ_MIRROR_DIR = dir;
  resetMirrorMemory();
  log = [COPY, DELETE].join("\r\n");
  clock = Date.parse("2026-11-07T12:00:00Z");
  deps = {
    platform: "win32",
    exists: () => true,
    isRekordboxRunning: async () => false,
    runRobocopy: vi.fn(async (args: string[]) => {
      if (args.includes("/L")) return 1;
      return new Promise<number>((resolve) => (finish = resolve));
    }),
    readLog: () => log,
    newLogPath: () => path.join(dir, "log.txt"),
    now: () => new Date(clock),
  };
});
afterEach(() => {
  delete process.env.DKJ_MIRROR_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const realRuns = () => vi.mocked(deps.runRobocopy).mock.calls.filter(([args]) => !args.includes("/L")).length;

describe("dryRunMirror", () => {
  it("toont kopieën en verwijderingen zonder iets te spiegelen", async () => {
    const summary = await dryRunMirror(deps, CONFIG);
    expect(summary.counts).toEqual({ copies: 1, deletions: 1, reserveNewer: 0 });
    expect(summary.deletions[0].path).toBe("F:\\weg.wav");
    expect(realRuns()).toBe(0);
  });

  it("weigert zolang rekordbox draait, een schijf ontbreekt, of buiten Windows", async () => {
    await expect(dryRunMirror({ ...deps, isRekordboxRunning: async () => true }, CONFIG)).rejects.toThrow(/rekordbox/);
    await expect(dryRunMirror({ ...deps, exists: (p) => p !== "F:\\" }, CONFIG)).rejects.toThrow(/reserveschijf/);
    await expect(dryRunMirror({ ...deps, platform: "linux" }, CONFIG)).rejects.toThrow(/Windows/);
    await expect(dryRunMirror(deps, null)).rejects.toThrow(/config\.json/);
    expect(deps.runRobocopy).not.toHaveBeenCalled();
  });
});

describe("startMirror", () => {
  it("spiegelt de goedgekeurde dry run en legt het moment vast", async () => {
    const { digest } = await dryRunMirror(deps, CONFIG);
    await startMirror(digest, deps, CONFIG);
    expect(getMirrorRunStatus().running).toBe(true);
    expect(realRuns()).toBe(1);
    clock += 60_000;
    finish(1);
    await vi.waitFor(() => expect(getMirrorRunStatus().result).toBe("ok"));
    expect(readMirrorState().lastSuccessAt).toBe("2026-11-07T12:01:00.000Z");
  });

  it("weigert als de verse dry run iets anders zou doen dan de goedgekeurde", async () => {
    const { digest } = await dryRunMirror(deps, CONFIG);
    log = [COPY, DELETE, "\t  *EXTRA File \t\t\tF:\\nog-een.wav"].join("\r\n");
    await expect(startMirror(digest, deps, CONFIG)).rejects.toThrow(/veranderd/);
    expect(realRuns()).toBe(0);
  });

  it("weigert als een bestand op de reserve nieuwer is", async () => {
    log = [COPY, OLDER].join("\r\n");
    const summary = await dryRunMirror(deps, CONFIG);
    expect(summary.counts.reserveNewer).toBe(1);
    await expect(startMirror(summary.digest, deps, CONFIG)).rejects.toThrow(/nieuwer/);
    expect(realRuns()).toBe(0);
  });

  it("weigert een onbekende of verlopen dry run, en een tweede keer dezelfde", async () => {
    await expect(startMirror("verzonnen", deps, CONFIG)).rejects.toThrow(/dry run/);
    const { digest } = await dryRunMirror(deps, CONFIG);
    clock += PLAN_MAX_AGE_MS + 1;
    await expect(startMirror(digest, deps, CONFIG)).rejects.toThrow(/kwartier/);

    clock = Date.parse("2026-11-07T13:00:00Z");
    const again = await dryRunMirror(deps, CONFIG);
    await startMirror(again.digest, deps, CONFIG);
    finish(0);
    await vi.waitFor(() => expect(getMirrorRunStatus().running).toBe(false));
    await expect(startMirror(again.digest, deps, CONFIG)).rejects.toThrow(/niet \(meer\) de laatste/);
  });

  it("meldt een mislukte spiegel en legt dan geen moment vast", async () => {
    const { digest } = await dryRunMirror(deps, CONFIG);
    await startMirror(digest, deps, CONFIG);
    finish(8);
    await vi.waitFor(() => expect(getMirrorRunStatus().result).toMatch(/exitcode 8/));
    expect(readMirrorState().lastSuccessAt).toBeNull();
  });
});
