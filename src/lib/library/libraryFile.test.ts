import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { exportHash, exportLibrary, openLibrary, restoreLibrary, syncWithExport, withLibrary } from "./libraryFile";
import { ensureSpotifyLinkTable } from "./trackIds";
import { getTrack, listTracks, upsertTracks } from "./trackStore";

let tmp: string;
let exportDir: string;
let dbPath: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "library-file-"));
  exportDir = path.join(tmp, "export");
  dbPath = path.join(tmp, "library.db");
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const memoryDb = () => openLibraryDb(":memory:").db;

function seed(db: ReturnType<typeof memoryDb>) {
  upsertTracks(db, [
    { track_id: "T000002", title: "Rehab", artists: ["Amy Winehouse"], bpm: 72 },
    { track_id: "T000001", title: "No One", artists: ["Alicia Keys"], tags: ["soul"] },
  ]);
  ensureSpotifyLinkTable(db);
  const link = db.prepare("INSERT INTO spotify_track_ids (spotify_track_id, track_id, song_key) VALUES (?, ?, ?)");
  link.run("sp-b", "T000001", "no one|a");
  link.run("sp-a", "T000001", "no one|a");
  link.run("sp-c", "T000002", "rehab|b");
}

const readLinks = (db: ReturnType<typeof memoryDb>) =>
  db.prepare("SELECT * FROM spotify_track_ids ORDER BY spotify_track_id").all().map((row) => ({ ...row }));

describe("exportLibrary / restoreLibrary", () => {
  it("schrijft één regel per rij, gesorteerd, en levert elke keer dezelfde bytes", () => {
    const db = memoryDb();
    seed(db);
    exportLibrary(db, exportDir);
    const tracks = fs.readFileSync(path.join(exportDir, "tracks.ndjson"), "utf8");
    const links = fs.readFileSync(path.join(exportDir, "spotify_track_ids.ndjson"), "utf8");

    expect(tracks.trim().split("\n").map((line) => JSON.parse(line).track_id)).toEqual(["T000001", "T000002"]);
    expect(links.trim().split("\n").map((line) => JSON.parse(line).spotify_track_id)).toEqual(["sp-a", "sp-b", "sp-c"]);
    expect(JSON.parse(tracks.split("\n")[0]).artists).toEqual(["Alicia Keys"]);

    exportLibrary(db, exportDir);
    expect(fs.readFileSync(path.join(exportDir, "tracks.ndjson"), "utf8")).toBe(tracks);
  });

  it("zet in een lege database precies terug wat er geëxporteerd werd, tijdstempels incluis", () => {
    const source = memoryDb();
    seed(source);
    exportLibrary(source, exportDir);

    const target = memoryDb();
    expect(restoreLibrary(target, exportDir)).toEqual({ tracks: 2, links: 3, artists: 0 });
    expect(listTracks(target)).toEqual(listTracks(source));
    expect(readLinks(target)).toEqual(readLinks(source));
  });

  it("vervangt bij terugzetten wat er stond, in plaats van aan te vullen", () => {
    const source = memoryDb();
    seed(source);
    exportLibrary(source, exportDir);

    const target = memoryDb();
    upsertTracks(target, [{ track_id: "T999999", title: "Weg ermee" }]);
    restoreLibrary(target, exportDir);
    expect(getTrack(target, "T999999")).toBeNull();
  });

  it("telt CRLF-regeleinden (een Windows-checkout) niet als andere data", () => {
    const db = memoryDb();
    seed(db);
    const hash = exportLibrary(db, exportDir);
    for (const name of ["tracks.ndjson", "spotify_track_ids.ndjson"]) {
      const file = path.join(exportDir, name);
      fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/\n/g, "\r\n"));
    }
    expect(exportHash(exportDir)).toBe(hash);
  });
});

describe("syncWithExport / openLibrary / withLibrary", () => {
  it("gooit geen werk weg als het exporteren halverwege misging", () => {
    withLibrary((db) => seed(db), dbPath, exportDir);

    // Het werk wordt gecommit, tracks.ndjson is al nieuw, en dan valt het proces om voordat de
    // koppelingen en de hash geschreven zijn. Op schijf staat nu een export die niet klopt.
    expect(() =>
      withLibrary(
        (db) => {
          upsertTracks(db, [{ track_id: "T000003", title: "Valerie" }]);
          fs.appendFileSync(path.join(exportDir, "tracks.ndjson"), '{"track_id":"T000099"}\n');
          throw new Error("proces valt om");
        },
        dbPath,
        exportDir
      )
    ).toThrow("proces valt om");

    const { db, sync } = openLibrary(dbPath, exportDir);
    expect(sync).toBe("exported");
    expect(getTrack(db, "T000003")?.title).toBe("Valerie");
    db.close();
    const ids = fs.readFileSync(path.join(exportDir, "tracks.ndjson"), "utf8").trim().split("\n");
    expect(ids.map((line) => JSON.parse(line).track_id)).toEqual(["T000001", "T000002", "T000003"]);
  });

  it("weigert een export-regel zonder verplicht veld, zonder iets te wissen", () => {
    const db = memoryDb();
    seed(db);
    exportLibrary(db, exportDir);
    fs.appendFileSync(path.join(exportDir, "spotify_track_ids.ndjson"), '{"track_id":"T000009"}\n');

    const target = memoryDb();
    upsertTracks(target, [{ track_id: "T000042", title: "Blijft staan" }]);
    expect(() => restoreLibrary(target, exportDir)).toThrow(/spotify_track_id/);
    expect(getTrack(target, "T000042")?.title).toBe("Blijft staan");
  });

  it("bouwt op een verse kloon (export, geen database) de database op", () => {
    const source = memoryDb();
    seed(source);
    exportLibrary(source, exportDir);

    const { db, sync } = openLibrary(dbPath, exportDir);
    expect(sync).toBe("restored");
    expect(getTrack(db, "T000002")?.title).toBe("Rehab");
    db.close();

    const again = openLibrary(dbPath, exportDir);
    expect(again.sync).toBe("in-sync");
    again.db.close();
  });

  it("neemt een export over die na een git pull veranderd is", () => {
    withLibrary((db) => seed(db), dbPath, exportDir);

    // Een andere machine voegde een nummer toe en pushte de export.
    const other = memoryDb();
    restoreLibrary(other, exportDir);
    upsertTracks(other, [{ track_id: "T000003", title: "Valerie" }]);
    exportLibrary(other, exportDir);

    const { db, sync } = openLibrary(dbPath, exportDir);
    expect(sync).toBe("restored");
    expect(getTrack(db, "T000003")?.title).toBe("Valerie");
    db.close();
  });

  it("schrijft de export als er wel data is maar nog geen export", () => {
    const { db: first } = openLibraryDb(dbPath);
    seed(first);
    first.close();

    const { db, sync } = openLibrary(dbPath, exportDir);
    expect(sync).toBe("exported");
    expect(exportHash(exportDir)).not.toBeNull();
    db.close();
  });

  it("doet niets bij een lege database zonder export", () => {
    const db = memoryDb();
    expect(syncWithExport(db, exportDir)).toBe("empty");
    expect(fs.existsSync(exportDir)).toBe(false);
  });

  it("exporteert na elke schrijvende stap, zodat de volgende opening niets hoeft te doen", () => {
    withLibrary((db) => seed(db), dbPath, exportDir);
    withLibrary((db) => upsertTracks(db, [{ track_id: "T000001", notes: "opener" }]), dbPath, exportDir);

    const lines = fs.readFileSync(path.join(exportDir, "tracks.ndjson"), "utf8").trim().split("\n");
    expect(JSON.parse(lines[0]).notes).toBe("opener");
    const { db, sync } = openLibrary(dbPath, exportDir);
    expect(sync).toBe("in-sync");
    db.close();
  });
});
