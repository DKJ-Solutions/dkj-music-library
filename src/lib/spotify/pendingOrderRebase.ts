// Een uitgestelde volgorde (pendingOrderStore.ts) meeverhuizen naar een nieuwe stand van de playlist
// (Dave, 5 november 2026). Verplaatsingen worden nu altijd eerst lokaal bewaard en pas later verstuurd, dus
// tussen een verplaatsing en de push kan de playlist veranderen: een Fetch of volledige sync vervangt de
// snapshot. De lokale volgorde blijft dan staan voor de tracks die er nog zijn, verdwenen tracks vallen weg
// en nieuwe komen onderaan (rebaseOrder in library/pendingOrder.ts), en de vermelding wijst daarna naar de
// nieuwe snapshot. Een vermelding die al bij een andere snapshot dan `previous` hoorde, kan niet meer
// herbaseerd worden (de indices zijn van een lijst die we niet meer hebben) en blijft ongemoeid.
//
// SERVER-ONLY: gebruikt de pendingOrderStore.
import { isPermutation, rebaseOrder } from "@/lib/library/pendingOrder";
import { getPendingOrder, setPendingOrder } from "./pendingOrderStore";
import type { Playlist } from "./types";

const trackIds = (playlist: Playlist) => playlist.tracks.map((item) => item.track?.id ?? null);

/** Herbaseert de uitgestelde volgorde van `previous` op `next` (dezelfde playlist, nieuwe stand). */
export function rebasePendingOrder(previous: Playlist, next: Playlist): void {
  const pending = getPendingOrder(previous.id);
  if (!pending || pending.baseSnapshotId !== previous.snapshotId || !isPermutation(pending.order, previous.tracks.length)) return;
  setPendingOrder(previous.id, {
    baseSnapshotId: next.snapshotId,
    order: rebaseOrder(trackIds(previous), pending.order, trackIds(next)),
    moveCount: pending.moveCount,
  });
}

/** Idem voor alle playlists van een volledige sync: elke playlist die in beide snapshots staat. */
export function rebasePendingOrders(previous: { playlists: Playlist[] } | null, next: { playlists: Playlist[] }): void {
  if (!previous) return;
  const nextById = new Map(next.playlists.map((p) => [p.id, p]));
  for (const old of previous.playlists) {
    const updated = nextById.get(old.id);
    if (updated) rebasePendingOrder(old, updated);
  }
}
