// De uitgestelde volgorde van een werkbak (Dave, 31 oktober 2026): verplaatsingen die je deed terwijl Spotify
// niet schrijven liet (rate limit, zie rateLimitStore.ts), lokaal bewaard in data/spotify/pending-order.json
// tot ze naar Spotify gestuurd (api/spotify/playlist-order/sync) of weggegooid zijn. Eigen bestand, los van de
// snapshot: een hersync overschrijft de snapshot in zijn geheel. Per playlist-id één vermelding.
//
// `order` is een permutatie van indices in `playlist.tracks` van de snapshot `baseSnapshotId` (zie
// library/pendingOrder.ts). Is de opgeslagen snapshot intussen een andere, dan klopt `order` niet meer en
// toont de pagina een conflict in plaats van de permutatie toe te passen.
//
// SERVER-ONLY: gebruikt Node's `fs`.
import fs from "fs";
import path from "path";
import { hasOverride, isValidPlaylistId, readOverrideFile } from "./overrideSafety";

const DEFAULT_PATH = path.join(process.cwd(), "data", "spotify", "pending-order.json");

export interface PendingOrder {
  baseSnapshotId: string;
  order: number[];
  /** Hoeveel verplaatsingen er sinds het begin in zitten (voor de knop; geen reden om te synchroniseren). */
  moveCount: number;
  updatedAt: string; // ISO
}

function storePath(): string {
  const override = process.env.SPOTIFY_PENDING_ORDER_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_PATH;
}

const isEntry = (value: unknown): value is PendingOrder => {
  const entry = value as Partial<PendingOrder> | null;
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.baseSnapshotId === "string" &&
    Array.isArray(entry.order) &&
    entry.order.every((i) => Number.isInteger(i)) &&
    typeof entry.moveCount === "number"
  );
};

function writeAll(entries: Record<string, PendingOrder>): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), "utf8");
}

/** De uitgestelde volgorde van een playlist, of null als er geen is (of de vermelding misvormd is). */
export function getPendingOrder(playlistId: string): PendingOrder | null {
  if (!isValidPlaylistId(playlistId)) return null;
  const entries = readOverrideFile<PendingOrder>(storePath(), "pendingOrderStore");
  return hasOverride(entries, playlistId) && isEntry(entries[playlistId]) ? entries[playlistId] : null;
}

export function setPendingOrder(playlistId: string, entry: Omit<PendingOrder, "updatedAt">): void {
  if (!isValidPlaylistId(playlistId)) throw new Error(`ongeldige playlist-id: ${JSON.stringify(playlistId)}`);
  const entries = readOverrideFile<PendingOrder>(storePath(), "pendingOrderStore");
  entries[playlistId] = { ...entry, updatedAt: new Date().toISOString() };
  writeAll(entries);
}

export function deletePendingOrder(playlistId: string): void {
  if (!isValidPlaylistId(playlistId)) return;
  const entries = readOverrideFile<PendingOrder>(storePath(), "pendingOrderStore");
  if (!hasOverride(entries, playlistId)) return;
  delete entries[playlistId];
  writeAll(entries);
}
