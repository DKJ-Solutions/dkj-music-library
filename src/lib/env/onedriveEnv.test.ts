import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOneDriveEnvPath, parseEnvFile, recoverEnvFromOneDrive, syncEnvFromOneDrive } from "./onedriveEnv";

const FILLED = "SPOTIFY_CLIENT_ID=abc\nSPOTIFY_CLIENT_SECRET=def\n";
const UNFILLED = "SPOTIFY_CLIENT_ID=vul-hier-je-client-id-in\nSPOTIFY_CLIENT_SECRET=vul-hier-je-client-secret-in\n";

let dir: string;
let target: string;
let source: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "onedrive-env-"));
  target = path.join(dir, "repo.env.local");
  source = path.join(dir, "onedrive.env.local");
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("getOneDriveEnvPath", () => {
  it("bouwt het pad op uit de OneDrive-variabele", () => {
    expect(getOneDriveEnvPath({ OneDrive: "X:\\od" })).toBe(
      path.join("X:\\od", "dkj-solutions", "dkj-music-library", ".env.local")
    );
  });

  it("geeft null zonder OneDrive", () => {
    expect(getOneDriveEnvPath({})).toBeNull();
  });
});

describe("syncEnvFromOneDrive", () => {
  it("kopieert de OneDrive-versie als de repo er nog geen heeft", () => {
    fs.writeFileSync(source, FILLED);
    expect(syncEnvFromOneDrive(target, source)).toEqual({ kind: "copied", from: source });
    expect(fs.readFileSync(target, "utf8")).toBe(FILLED);
  });

  it("laat een ingevulde .env.local in de repo staan", () => {
    fs.writeFileSync(target, "SPOTIFY_CLIENT_ID=eigen\n");
    fs.writeFileSync(source, FILLED);
    expect(syncEnvFromOneDrive(target, source)).toEqual({ kind: "present" });
    expect(fs.readFileSync(target, "utf8")).toBe("SPOTIFY_CLIENT_ID=eigen\n");
  });

  it("overschrijft een repo-kopie die nog de voorbeeldwaarden bevat", () => {
    fs.writeFileSync(target, UNFILLED);
    fs.writeFileSync(source, FILLED);
    expect(syncEnvFromOneDrive(target, source).kind).toBe("copied");
    expect(fs.readFileSync(target, "utf8")).toBe(FILLED);
  });

  it("kopieert geen OneDrive-versie die nog niet is ingevuld", () => {
    fs.writeFileSync(source, UNFILLED);
    expect(syncEnvFromOneDrive(target, source).kind).toBe("source-unfilled");
    expect(fs.existsSync(target)).toBe(false);
  });

  it("meldt een ontbrekende OneDrive-versie zonder iets te schrijven", () => {
    expect(syncEnvFromOneDrive(target, source).kind).toBe("source-missing");
    expect(syncEnvFromOneDrive(target, null).kind).toBe("no-onedrive");
    expect(fs.existsSync(target)).toBe(false);
  });
});

describe("parseEnvFile", () => {
  it("leest KEY=waarde, slaat commentaar over en haalt aanhalingstekens weg", () => {
    expect(parseEnvFile("# uitleg\r\nA=1\n\nB=\"twee = 2\"\nC='drie'\ngeen-regel\n")).toEqual({
      A: "1",
      B: "twee = 2",
      C: "drie",
    });
  });
});

describe("recoverEnvFromOneDrive (#128)", () => {
  it("neemt een kopie die er pas later is alsnog over en laadt de sleutels", () => {
    const env: Record<string, string | undefined> = {};
    expect(recoverEnvFromOneDrive(target, source, env).kind).toBe("source-missing");
    expect(env.SPOTIFY_CLIENT_ID).toBeUndefined();

    fs.writeFileSync(source, FILLED); // OneDrive is klaar met synchroniseren
    expect(recoverEnvFromOneDrive(target, source, env).kind).toBe("copied");
    expect(env).toMatchObject({ SPOTIFY_CLIENT_ID: "abc", SPOTIFY_CLIENT_SECRET: "def" });
  });

  it("laadt een al aanwezige .env.local, maar overschrijft geen gezette waarde", () => {
    fs.writeFileSync(target, FILLED);
    const env: Record<string, string | undefined> = { SPOTIFY_CLIENT_ID: "al-gezet" };
    expect(recoverEnvFromOneDrive(target, null, env).kind).toBe("present");
    expect(env).toEqual({ SPOTIFY_CLIENT_ID: "al-gezet", SPOTIFY_CLIENT_SECRET: "def" });
  });

  it("laadt niets uit een kopie met voorbeeldwaarden", () => {
    fs.writeFileSync(source, UNFILLED);
    const env: Record<string, string | undefined> = {};
    expect(recoverEnvFromOneDrive(target, source, env).kind).toBe("source-unfilled");
    expect(env).toEqual({});
  });
});
