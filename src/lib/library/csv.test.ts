import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsvRecords, parseCsvRows } from "./csv";

describe("detectDelimiter", () => {
  it("herkent komma, puntkomma (Nederlandse Excel) en tab", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });

  it("telt een scheidingsteken tussen aanhalingstekens niet mee", () => {
    expect(detectDelimiter('"a,b,c";d;e')).toBe(";");
  });
});

describe("parseCsvRows", () => {
  it("leest aanhalingstekens, dubbele aanhalingstekens en regeleinden in een cel", () => {
    expect(parseCsvRows('a,b\r\n"x, y","zei ""hoi""\nen ging"\r\n', ",")).toEqual([
      ["a", "b"],
      ["x, y", 'zei "hoi"\nen ging'],
    ]);
  });

  it("slaat een BOM en lege regels over", () => {
    expect(parseCsvRows("﻿a,b\n\n1,2", ",")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("weigert een niet-afgesloten aanhalingsteken", () => {
    expect(() => parseCsvRows('a\n"open', ",")).toThrow();
  });
});

describe("parseCsvRecords", () => {
  it("koppelt cellen aan de kopregel", () => {
    expect(parseCsvRecords("dkj_track_id;title\ndkj-1;Levels")).toEqual([{ dkj_track_id: "dkj-1", title: "Levels" }]);
  });

  it("weigert een rij met meer cellen dan de kopregel", () => {
    expect(() => parseCsvRecords("a,b\n1,2,3")).toThrow(/rij 2/);
  });
});
