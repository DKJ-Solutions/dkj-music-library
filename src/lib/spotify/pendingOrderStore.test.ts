// pendingOrderStore.ts: de uitgestelde volgorde per playlist, in een eigen bestand.
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deletePendingOrder, getPendingOrder, setPendingOrder } from "./pendingOrderStore";

const ID = "P".repeat(22);
let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-pending-"));
  process.env.SPOTIFY_PENDING_ORDER_STORE_PATH = path.join(dir, "pending-order.json");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("pendingOrderStore", () => {
  it("bewaart, leest en verwijdert per playlist", () => {
    expect(getPendingOrder(ID)).toBeNull();
    setPendingOrder(ID, { baseSnapshotId: "s1", order: [1, 0], moveCount: 1 });
    expect(getPendingOrder(ID)).toMatchObject({ baseSnapshotId: "s1", order: [1, 0], moveCount: 1 });
    expect(getPendingOrder("Q".repeat(22))).toBeNull();
    deletePendingOrder(ID);
    expect(getPendingOrder(ID)).toBeNull();
  });

  it("weigert een ongeldige playlist-id bij schrijven en negeert hem bij lezen", () => {
    expect(() => setPendingOrder("__proto__", { baseSnapshotId: "s", order: [], moveCount: 0 })).toThrow();
    expect(getPendingOrder("__proto__")).toBeNull();
  });

  it("negeert een misvormde vermelding", () => {
    fs.writeFileSync(process.env.SPOTIFY_PENDING_ORDER_STORE_PATH!, JSON.stringify({ [ID]: { order: "nee" } }));
    expect(getPendingOrder(ID)).toBeNull();
  });
});
