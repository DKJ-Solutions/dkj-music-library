import { describe, expect, it } from "vitest";
import { buildRobocopyArgs, parseRobocopyLog, pathProblem, planDigest } from "./robocopyPlan";

// Zo ziet een /L-log met /FP /NS /NJH /NJS eruit: tabs, klasse, bij een map een aantal, en het volledige pad.
const LOG = [
  "",
  "\t                   3\tE:\\Muziek\\",
  "\t  New Dir          2\tE:\\Muziek\\Nieuw album\\",
  "\t    New File  \t\tE:\\Muziek\\Nieuw album\\01 Één.mp3",
  "\t    Newer     \t\tE:\\Muziek\\rekordbox\\master.db",
  "\t*EXTRA Dir        -1\tF:\\Muziek\\Oud\\",
  "\t  *EXTRA File \t\tF:\\Muziek\\weg.wav",
  "\t    Older     \t\tE:\\Muziek\\bewerkt.aiff",
  "\t    Same      \t\tE:\\Muziek\\gelijk.flac",
].join("\r\n");

describe("buildRobocopyArgs", () => {
  it("zet /L alleen bij een dry run, en sluit de systeemmappen uit", () => {
    const dry = buildRobocopyArgs("E:\\", "F:\\", { dryRun: true, logPath: "C:\\t\\log.txt" });
    expect(dry.slice(0, 4)).toEqual(["E:\\", "F:\\", "/MIR", "/L"]);
    expect(dry).toContain("System Volume Information");
    expect(dry).toContain("/UNILOG:C:\\t\\log.txt");
    expect(buildRobocopyArgs("E:\\", "F:\\", { dryRun: false, logPath: "x" })).not.toContain("/L");
  });
});

describe("parseRobocopyLog", () => {
  it("deelt het log op in kopieën, verwijderingen en nieuwere reservebestanden", () => {
    const plan = parseRobocopyLog(LOG);
    expect(plan.copies.map((e) => e.path)).toEqual([
      "E:\\Muziek\\Nieuw album\\",
      "E:\\Muziek\\Nieuw album\\01 Één.mp3",
      "E:\\Muziek\\rekordbox\\master.db",
    ]);
    expect(plan.deletions.map((e) => [e.label, e.path])).toEqual([
      ["*EXTRA Dir", "F:\\Muziek\\Oud\\"],
      ["*EXTRA File", "F:\\Muziek\\weg.wav"],
    ]);
    expect(plan.reserveNewer.map((e) => e.path)).toEqual(["E:\\Muziek\\bewerkt.aiff"]);
  });

  it("levert een leeg plan als alles gelijk is", () => {
    expect(parseRobocopyLog("\t   12\tE:\\Muziek\\\r\n")).toEqual({ copies: [], deletions: [], reserveNewer: [] });
  });
});

describe("planDigest", () => {
  it("is gelijk voor hetzelfde plan, ongeacht de volgorde, en anders zodra er iets bij komt", () => {
    const plan = parseRobocopyLog(LOG);
    const shuffled = { ...plan, copies: [...plan.copies].reverse() };
    expect(planDigest(shuffled)).toBe(planDigest(plan));
    const more = { ...plan, deletions: [...plan.deletions, { kind: "delete" as const, label: "*EXTRA File", path: "F:\\x.mp3" }] };
    expect(planDigest(more)).not.toBe(planDigest(plan));
  });
});

describe("pathProblem", () => {
  it("accepteert twee aparte schijven", () => {
    expect(pathProblem("E:\\", "F:\\")).toBeNull();
    expect(pathProblem("E:\\Muziek", "F:\\Muziek")).toBeNull();
  });

  it("weigert leeg, relatief, hetzelfde pad en het ene pad in het andere", () => {
    expect(pathProblem("", "F:\\")).toMatch(/Stel/);
    expect(pathProblem("Muziek", "F:\\")).toMatch(/volledige paden/);
    expect(pathProblem("E:\\Muziek\\", "e:\\muziek")).toMatch(/hetzelfde/);
    expect(pathProblem("E:\\", "E:\\Reserve")).toMatch(/binnen/);
  });
});
