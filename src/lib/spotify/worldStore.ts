// De handmatige wereld-override-laag: sync-bestendig, in een EIGEN los bestand
// (data/spotify/worlds.json -- dezelfde al git-ignored data/-map als done.json/snapshot.json, zie
// .gitignore), zodat een hersync (buildSnapshot(), fase 3) 'm ongemoeid laat. Precies hetzelfde
// patroon als doneStore.ts, nu voor de wereld-correctie i.p.v. de "afgerond"-status.
//
// Een override overschrijft de auto-classificatie (classifyWorld.ts) 1-op-1 -- de effectieve
// wereld wordt pas in enrichedPlaylists.ts samengevoegd: override ?? classifyWorld(...).
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden.
//
// Prototype-pollution-verdediging: het overrides-object is prototype-loos en `in` is vervangen
// door `hasOwnProperty` (via overrideSafety.ts, gedeeld met bpmStore.ts/doneStore.ts) -- zie het
// commentaar daar voor de aanleiding.
import fs from "fs";
import path from "path";
import type { SpotifyWorld } from "./classifyWorld";
import { hasOverride, isValidPlaylistId, readOverrideFile } from "./overrideSafety";

const DEFAULT_WORLD_STORE_PATH = path.join(process.cwd(), "data", "spotify", "worlds.json");

export interface WorldOverrideEntry {
  world: SpotifyWorld;
  updatedAt: string; // ISO-tijdstip van de laatste correctie
}

export type WorldOverrides = Record<string, WorldOverrideEntry>; // sleutel: playlist-id

function getWorldStorePath(): string {
  const override = process.env.SPOTIFY_WORLD_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_WORLD_STORE_PATH;
}

export function readWorldOverrides(): WorldOverrides {
  return readOverrideFile<WorldOverrideEntry>(getWorldStorePath(), "worldStore");
}

function writeWorldOverrides(overrides: WorldOverrides): void {
  const storePath = getWorldStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(overrides, null, 2), "utf8");
}

// Leest de override van één playlist; null als er nog niets handmatig is vastgelegd -- dan geldt
// de auto-classificatie (zie classifyWorld.ts/enrichedPlaylists.ts). Een ongeldige playlist-id
// (zie isValidPlaylistId) telt hier gewoon als "geen override bekend" -- een leesactie hoeft
// nooit te crashen op een misvormde id.
export function getWorldOverride(playlistId: string): SpotifyWorld | null {
  if (!isValidPlaylistId(playlistId)) return null;
  const overrides = readWorldOverrides();
  return hasOverride(overrides, playlistId) ? overrides[playlistId].world : null;
}

// Zet (corrigeert) de handmatige wereld van één playlist. Read-modify-write op het hele bestand --
// zelfde schaalniveau/afweging als setDoneStatus in doneStore.ts (honderden playlists, handmatige
// correcties, geen concurrency-bescherming nodig voor deze single-user, lokale tool). Een
// ongeldige playlist-id gooit een fout -- zelfde redenering als setBpmOverride in bpmStore.ts: de
// aanroepende API-route valideert 'm al vóór dit punt, dit is puur een laatste, verdedigende linie.
export function setWorldOverride(playlistId: string, world: SpotifyWorld): void {
  if (!isValidPlaylistId(playlistId)) {
    throw new Error(`ongeldige playlist-id: ${JSON.stringify(playlistId)}`);
  }
  const overrides = readWorldOverrides();
  overrides[playlistId] = { world, updatedAt: new Date().toISOString() };
  writeWorldOverrides(overrides);
}

// Wist de handmatige override weer (terug naar "geraden") -- zo kan Dave een correctie
// terugdraaien zonder de auto-classificatie zelf te hoeven aanpassen. Bewust een no-op (geen
// fout) als er nog geen override was, of als de id ongeldig is.
export function clearWorldOverride(playlistId: string): void {
  if (!isValidPlaylistId(playlistId)) return;
  const overrides = readWorldOverrides();
  if (!hasOverride(overrides, playlistId)) return;
  delete overrides[playlistId];
  writeWorldOverrides(overrides);
}
