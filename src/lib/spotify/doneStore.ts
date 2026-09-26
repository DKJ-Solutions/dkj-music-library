// Fase 4: de "afgerond"-status per playlist. Dit is BEWUST een eigen, lokale laag, los van de
// Spotify-snapshot (zie de opdracht) -- de Spotify API kent geen "done"-concept, en een hersync
// (fase 3, buildSnapshot()) overschrijft data/spotify/snapshot.json in zijn geheel. Door de
// done-status in een EIGEN bestand te bewaren (data/spotify/done.json, dezelfde al git-ignored
// data/-map als de snapshot, zie .gitignore), overleeft 'm elke hersync ongeschonden: de
// leeslaag (enrichedPlaylists.ts) voegt de status pas ná het lezen toe, aan de hand van
// playlist-id.
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden.
//
// Prototype-pollution-verdediging: het statuses-object is prototype-loos (via overrideSafety.ts,
// gedeeld met bpmStore.ts/worldStore.ts) -- zie het commentaar daar voor de aanleiding.
import fs from "fs";
import path from "path";
import { hasOverride, isValidPlaylistId, readOverrideFile } from "./overrideSafety";

const DEFAULT_DONE_STORE_PATH = path.join(process.cwd(), "data", "spotify", "done.json");

export interface DoneEntry {
  done: boolean;
  updatedAt: string; // ISO-tijdstip van de laatste statuswijziging
}

export type DoneStatuses = Record<string, DoneEntry>; // sleutel: playlist-id

function getDoneStorePath(): string {
  const override = process.env.SPOTIFY_DONE_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_DONE_STORE_PATH;
}

export function readDoneStatuses(): DoneStatuses {
  return readOverrideFile<DoneEntry>(getDoneStorePath(), "doneStore");
}

function writeDoneStatuses(statuses: DoneStatuses): void {
  const storePath = getDoneStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(statuses, null, 2), "utf8");
}

// Leest de done-status van één playlist; false (niet afgerond) als er nog niets is vastgelegd --
// een playlist die nooit is aangeraakt telt niet als "klaar". Een ongeldige playlist-id (zie
// isValidPlaylistId) telt hier ook als "niet afgerond" -- een leesactie hoeft nooit te crashen op
// een misvormde id.
export function getDoneStatus(playlistId: string): boolean {
  if (!isValidPlaylistId(playlistId)) return false;
  const statuses = readDoneStatuses();
  return hasOverride(statuses, playlistId) ? statuses[playlistId].done : false;
}

// Zet (of wist) de done-status van één playlist. Read-modify-write op het hele bestand -- bij
// het schaalniveau hier (honderden playlists, handmatige toggles) is dat ruim voldoende; geen
// concurrency-bescherming nodig voor deze single-user, lokale tool. Een ongeldige playlist-id
// gooit een fout -- zelfde redenering als setBpmOverride in bpmStore.ts: de aanroepende API-route
// valideert 'm al vóór dit punt, dit is puur een laatste, verdedigende linie.
export function setDoneStatus(playlistId: string, done: boolean): void {
  if (!isValidPlaylistId(playlistId)) {
    throw new Error(`ongeldige playlist-id: ${JSON.stringify(playlistId)}`);
  }
  const statuses = readDoneStatuses();
  statuses[playlistId] = { done, updatedAt: new Date().toISOString() };
  writeDoneStatuses(statuses);
}
