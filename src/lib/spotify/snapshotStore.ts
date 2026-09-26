// Lokale opslag van de Spotify-snapshot (fase 3). LET OP: dit is NIET dezelfde map als
// .data/spotify/ (de token-store, zie tokenStore.ts) -- de snapshot bevat Dave's persoonlijke
// muziekbibliotheek en woont bewust apart in data/spotify/, buiten src/ en git-ignored (zie
// .gitignore in de root).
//
// Lichte historie-opzet: vóór elke nieuwe sync wordt de bestaande snapshot gekopieerd naar
// data/spotify/history/ (getimestampte bestandsnaam), met een cap op het aantal bewaarde
// versies -- vrijwel gratis back-up/versiehistorie (zie het dossier, §5) zonder ongebreidelde
// schijfgroei.
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden.

import fs from "fs";
import path from "path";
import type { Snapshot } from "./types";

const DEFAULT_SNAPSHOT_STORE_PATH = path.join(process.cwd(), "data", "spotify", "snapshot.json");
const DEFAULT_HISTORY_DIR = path.join(process.cwd(), "data", "spotify", "history");
const MAX_HISTORY_ENTRIES = 10;

function getSnapshotStorePath(): string {
  const override = process.env.SPOTIFY_SNAPSHOT_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_SNAPSHOT_STORE_PATH;
}

function getHistoryDir(): string {
  const override = process.env.SPOTIFY_SNAPSHOT_HISTORY_DIR;
  return override ? path.resolve(override) : DEFAULT_HISTORY_DIR;
}

export function readSnapshot(): Snapshot | null {
  const storePath = getSnapshotStorePath();
  if (!fs.existsSync(storePath)) return null;

  try {
    const raw = fs.readFileSync(storePath, "utf8");
    return JSON.parse(raw) as Snapshot;
  } catch (err) {
    console.warn(
      `[spotify/snapshotStore] kon ${storePath} niet lezen, behandel als geen vorige snapshot:`,
      err
    );
    return null;
  }
}

export function writeSnapshot(snapshot: Snapshot): void {
  const storePath = getSnapshotStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(snapshot, null, 2), "utf8");
}

// Kopieert de huidige snapshot (indien aanwezig) naar de historie-map vóórdat 'm wordt
// overschreven, en snoeit daarna terug tot MAX_HISTORY_ENTRIES (oudste eerst weg). No-op als er
// nog geen snapshot bestaat (eerste sync ooit).
export function archiveCurrentSnapshot(): void {
  const storePath = getSnapshotStorePath();
  if (!fs.existsSync(storePath)) return;

  const historyDir = getHistoryDir();
  fs.mkdirSync(historyDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(storePath, path.join(historyDir, `snapshot-${stamp}.json`));

  const entries = fs
    .readdirSync(historyDir)
    .filter((name) => name.startsWith("snapshot-") && name.endsWith(".json"))
    .sort(); // ISO-timestamp in de naam sorteert chronologisch

  const toDelete = entries.slice(0, Math.max(0, entries.length - MAX_HISTORY_ENTRIES));
  for (const name of toDelete) {
    fs.rmSync(path.join(historyDir, name));
  }
}
