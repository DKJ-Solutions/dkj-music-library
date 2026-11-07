// pendingOrderRebase.ts: een uitgestelde volgorde verhuist mee naar een nieuwe stand van de playlist (Fetch of
// volledige sync). De store is echt (naar een tijdelijke map omgeleid).
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPendingOrder, setPendingOrder } from "./pendingOrderStore";
import { rebasePendingOrder, rebasePendingOrders } from "./pendingOrderRebase";
import type { Playlist } from "./types";

const ID = "P".repeat(22);
const playlist = (snapshotId: string, ...ids: string[]) =>
  ({ id: ID, name: "House Mix Vol. X", snapshotId, tracks: ids.map((id) => ({ addedAt: null, addedBy: null, isLocal: false, track: { id } })) }) as unknown as Playlist;

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-rebase-"));
  process.env.SPOTIFY_PENDING_ORDER_STORE_PATH = path.join(dir, "pending-order.json");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("rebasePendingOrder", () => {
  it("zet de vermelding op de nieuwe snapshot, met de lokale volgorde, nieuwe tracks onderaan en verdwenen weg", () => {
    setPendingOrder(ID, { baseSnapshotId: "s1", order: [2, 0, 1], moveCount: 4 }); // c a b
    rebasePendingOrder(playlist("s1", "a", "b", "c"), playlist("s2", "a", "x", "c"));
    // nieuw: a x c -> c a (b weg), x onderaan
    expect(getPendingOrder(ID)).toMatchObject({ baseSnapshotId: "s2", order: [2, 0, 1], moveCount: 4 });
  });

  it("laat een vermelding van een andere snapshot dan de vorige ongemoeid", () => {
    setPendingOrder(ID, { baseSnapshotId: "oud", order: [2, 0, 1], moveCount: 1 });
    rebasePendingOrder(playlist("s1", "a", "b", "c"), playlist("s2", "a", "b", "c"));
    expect(getPendingOrder(ID)).toMatchObject({ baseSnapshotId: "oud", order: [2, 0, 1] });
  });

  it("doet niets zonder uitgestelde volgorde", () => {
    rebasePendingOrder(playlist("s1", "a"), playlist("s2", "a", "b"));
    expect(getPendingOrder(ID)).toBeNull();
  });
});

describe("rebasePendingOrders", () => {
  it("herbaseert elke playlist die in beide snapshots staat, en slaat een ontbrekende vorige snapshot over", () => {
    setPendingOrder(ID, { baseSnapshotId: "s1", order: [1, 0], moveCount: 1 });
    rebasePendingOrders(null, { playlists: [playlist("s2", "a", "b")] });
    expect(getPendingOrder(ID)?.baseSnapshotId).toBe("s1");
    rebasePendingOrders({ playlists: [playlist("s1", "a", "b")] }, { playlists: [playlist("s2", "a", "b", "c")] });
    expect(getPendingOrder(ID)).toMatchObject({ baseSnapshotId: "s2", order: [1, 0, 2] });
  });
});
