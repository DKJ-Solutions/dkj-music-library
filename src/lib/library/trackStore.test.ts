import { describe, expect, it } from "vitest";
import { openLibraryDb, syncSchema } from "./db";
import { TRACK_FIELDS, validateFields, type FieldDef } from "./fields";
import { parseImportText } from "./importFile";
import {
  countTracks,
  deleteTrack,
  getTrack,
  listTracks,
  toSqlValue,
  TrackInputError,
  upsertTracks,
} from "./trackStore";

const memoryDb = (fields: readonly FieldDef[] = TRACK_FIELDS) => openLibraryDb(":memory:", fields).db;

describe("het schema in fields.ts", () => {
  it("is zelf geldig", () => {
    expect(() => validateFields(TRACK_FIELDS)).not.toThrow();
  });

  it("weigert dubbele, gereserveerde en ongeldige veldnamen", () => {
    expect(() => validateFields([{ key: "bpm", type: "real", label: "" }, { key: "bpm", type: "real", label: "" }])).toThrow();
    expect(() => validateFields([{ key: "dkj_track_id", type: "text", label: "" }])).toThrow();
    expect(() => validateFields([{ key: "Mijn Veld", type: "text", label: "" }])).toThrow();
  });
});

describe("syncSchema", () => {
  const base: FieldDef[] = [{ key: "title", type: "text", label: "" }];

  it("voegt een nieuw veld toe aan een bestaande database, met behoud van de rijen", () => {
    const db = memoryDb(base);
    upsertTracks(db, [{ dkj_track_id: "t1", title: "Eerste" }], base);

    const withEnergy = [...base, { key: "energy", type: "integer", label: "" } as FieldDef];
    expect(syncSchema(db, withEnergy).added).toEqual(["energy"]);

    expect(getTrack(db, "t1", withEnergy)).toMatchObject({ title: "Eerste", energy: null });
    upsertTracks(db, [{ dkj_track_id: "t1", energy: 7 }], withEnergy);
    expect(getTrack(db, "t1", withEnergy)).toMatchObject({ title: "Eerste", energy: 7 });
  });

  it("hernoemt een kolom via renamedFrom, met de data erin", () => {
    const db = memoryDb([{ key: "key", type: "text", label: "" }]);
    upsertTracks(db, [{ dkj_track_id: "t1", key: "8A" }], [{ key: "key", type: "text", label: "" }]);

    const renamed: FieldDef[] = [{ key: "musical_key", type: "text", label: "", renamedFrom: "key" }];
    expect(syncSchema(db, renamed).renamed).toEqual([{ from: "key", to: "musical_key" }]);
    expect(getTrack(db, "t1", renamed)?.musical_key).toBe("8A");
    expect(syncSchema(db, renamed).renamed).toEqual([]); // tweede keer: niets meer te doen
  });

  it("laat een weggehaald veld en zijn data staan, en meldt het", () => {
    const db = memoryDb([...base, { key: "oud", type: "text", label: "" }]);
    expect(syncSchema(db, base).orphaned).toEqual(["oud"]);
  });
});

describe("upsertTracks", () => {
  it("voegt toe en werkt daarna alleen de meegegeven velden bij", () => {
    const db = memoryDb();
    expect(
      upsertTracks(db, [{ dkj_track_id: "dkj-0001", title: "Levels", artists: ["Avicii"], bpm: 126 }])
    ).toEqual({ inserted: 1, updated: 0 });

    expect(upsertTracks(db, [{ dkj_track_id: "dkj-0001", bpm: 126.5 }])).toEqual({ inserted: 0, updated: 1 });
    expect(getTrack(db, "dkj-0001")).toMatchObject({
      title: "Levels",
      artists: ["Avicii"],
      bpm: 126.5,
    });
    expect(countTracks(db)).toBe(1);
  });

  it("schrijft niets als één rij fout is", () => {
    const db = memoryDb();
    expect(() =>
      upsertTracks(db, [{ dkj_track_id: "a", title: "Goed" }, { dkj_track_id: "b", bmp: 120 }])
    ).toThrow(/rij 2: onbekend veld "bmp"/);
    expect(countTracks(db)).toBe(0);
  });

  it("eist een dkj_track_id", () => {
    expect(() => upsertTracks(memoryDb(), [{ title: "Zonder ID" }])).toThrow(TrackInputError);
  });

  it("maakt een veld leeg met null", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a", genre: "House" }]);
    upsertTracks(db, [{ dkj_track_id: "a", genre: null }]);
    expect(getTrack(db, "a")?.genre).toBeNull();
  });

  it("lijst, telt en verwijdert", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "b" }, { dkj_track_id: "a" }]);
    expect(listTracks(db).map((t) => t.dkj_track_id)).toEqual(["a", "b"]);
    expect(deleteTrack(db, "a")).toBe(true);
    expect(deleteTrack(db, "a")).toBe(false);
    expect(countTracks(db)).toBe(1);
  });

  it("verwerkt 6000 tracks in één keer", () => {
    const db = memoryDb();
    const records = Array.from({ length: 6000 }, (_, i) => ({ dkj_track_id: `t${i}`, title: `Track ${i}`, bpm: 120 }));
    expect(upsertTracks(db, records).inserted).toBe(6000);
    expect(countTracks(db)).toBe(6000);
  });
});

describe("toSqlValue", () => {
  const field = (type: FieldDef["type"]): FieldDef => ({ key: "x", type, label: "" });

  it("parseert strings uit een CSV per type", () => {
    expect(toSqlValue(field("integer"), "215000")).toBe(215000);
    expect(toSqlValue(field("real"), "127,98")).toBe(127.98);
    expect(toSqlValue(field("boolean"), "ja")).toBe(1);
    expect(toSqlValue(field("json"), "Artiest A; Artiest B")).toBe('["Artiest A","Artiest B"]');
    expect(toSqlValue(field("json"), '["A"]')).toBe('["A"]');
  });

  it("weigert een waarde die niet bij het type past", () => {
    expect(() => toSqlValue(field("integer"), "12.5")).toThrow(TrackInputError);
    expect(() => toSqlValue(field("real"), "snel")).toThrow(TrackInputError);
    expect(() => toSqlValue(field("boolean"), "misschien")).toThrow(TrackInputError);
  });
});

describe("import uit CSV", () => {
  it("laat een lege cel de bestaande waarde staan", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a", title: "Titel", bpm: 128 }]);
    upsertTracks(db, parseImportText("dkj_track_id;title;bpm\na;;130\n", "csv"));
    expect(getTrack(db, "a")).toMatchObject({ title: "Titel", bpm: 130 });
  });

  it("leest JSON als lijst of als { tracks }", () => {
    expect(parseImportText('[{"dkj_track_id":"a"}]', "json")).toEqual([{ dkj_track_id: "a" }]);
    expect(parseImportText('{"tracks":[{"dkj_track_id":"a"}]}', "json")).toEqual([{ dkj_track_id: "a" }]);
    expect(() => parseImportText('{"x":1}', "json")).toThrow();
  });
});
