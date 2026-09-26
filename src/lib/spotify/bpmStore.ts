// De handmatige BPM-override-laag: sync-bestendig, in een EIGEN los bestand
// (data/spotify/bpm.json -- dezelfde al git-ignored data/-map als worlds.json/done.json/
// snapshot.json, zie .gitignore), zodat een hersync (buildSnapshot(), fase 3) 'm ongemoeid laat.
// Exact hetzelfde recept als worldStore.ts, nu voor de BPM-correctie binnen MMC i.p.v. de
// wereld-correctie.
//
// Een override overschrijft de auto-classificatie (classifyBpm.ts) 1-op-1 -- de effectieve BPM
// wordt pas in enrichedPlaylists.ts samengevoegd: override ?? classifyMmcBpm(...).
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden.
//
// Prototype-pollution-verdediging: het overrides-object is prototype-loos en `in` is vervangen
// door `hasOwnProperty` (via overrideSafety.ts, gedeeld met worldStore.ts/doneStore.ts) --
// zie het commentaar daar voor de aanleiding.
import fs from "fs";
import path from "path";
import type { MmcBpmTier } from "./classifyBpm";
import { hasOverride, isValidPlaylistId, readOverrideFile } from "./overrideSafety";

const DEFAULT_BPM_STORE_PATH = path.join(process.cwd(), "data", "spotify", "bpm.json");

export interface BpmOverrideEntry {
  bpm: MmcBpmTier;
  updatedAt: string; // ISO-tijdstip van de laatste correctie
}

export type BpmOverrides = Record<string, BpmOverrideEntry>; // sleutel: playlist-id

function getBpmStorePath(): string {
  const override = process.env.SPOTIFY_BPM_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_BPM_STORE_PATH;
}

export function readBpmOverrides(): BpmOverrides {
  return readOverrideFile<BpmOverrideEntry>(getBpmStorePath(), "bpmStore");
}

function writeBpmOverrides(overrides: BpmOverrides): void {
  const storePath = getBpmStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(overrides, null, 2), "utf8");
}

// Leest de override van één playlist; null als er nog niets handmatig is vastgelegd -- dan geldt
// de auto-classificatie (zie classifyBpm.ts/enrichedPlaylists.ts). Een ongeldige playlist-id
// (zie isValidPlaylistId) telt hier gewoon als "geen override bekend" -- een leesactie hoeft
// nooit te crashen op een misvormde id.
export function getBpmOverride(playlistId: string): MmcBpmTier | null {
  if (!isValidPlaylistId(playlistId)) return null;
  const overrides = readBpmOverrides();
  return hasOverride(overrides, playlistId) ? overrides[playlistId].bpm : null;
}

// Zet (corrigeert) de handmatige BPM van één playlist. Read-modify-write op het hele bestand --
// zelfde schaalniveau/afweging als setWorldOverride in worldStore.ts. Een ongeldige playlist-id
// gooit een fout -- deze functie schrijft weg naar schijf, dus hier (i.t.t. get/clear) telt een
// misvormde id als een programmeerfout: de aanroepende API-route valideert 'm al vóór dit punt
// (zie api/spotify/bpm/route.ts), dus dit is puur een laatste, verdedigende linie.
export function setBpmOverride(playlistId: string, bpm: MmcBpmTier): void {
  if (!isValidPlaylistId(playlistId)) {
    throw new Error(`ongeldige playlist-id: ${JSON.stringify(playlistId)}`);
  }
  const overrides = readBpmOverrides();
  overrides[playlistId] = { bpm, updatedAt: new Date().toISOString() };
  writeBpmOverrides(overrides);
}

// Wist de handmatige override weer (terug naar "geraden") -- zo kan Dave een correctie
// terugdraaien zonder de auto-classificatie zelf te hoeven aanpassen. Bewust een no-op (geen
// fout) als er nog geen override was, of als de id ongeldig is.
export function clearBpmOverride(playlistId: string): void {
  if (!isValidPlaylistId(playlistId)) return;
  const overrides = readBpmOverrides();
  if (!hasOverride(overrides, playlistId)) return;
  delete overrides[playlistId];
  writeBpmOverrides(overrides);
}
