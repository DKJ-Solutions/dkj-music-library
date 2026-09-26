// Lokale, single-user token-store. Dit is geen multi-user-app -- een simpel JSON-bestand op
// schijf volstaat (zie de opdracht), buiten src/ en git-ignored (zie .gitignore in de root):
// tokens zijn geheimen en mogen nooit gecommit worden.
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden.

import fs from "fs";
import path from "path";

const DEFAULT_TOKEN_STORE_PATH = path.join(process.cwd(), ".data", "spotify", "tokens.json");

export interface SpotifyTokenRecord {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string;
  expiresAt: number; // epoch-ms, berekend uit expires_in bij ontvangst
  obtainedAt: number; // epoch-ms van de laatste (ver)verkrijging
}

function getTokenStorePath(): string {
  const override = process.env.SPOTIFY_TOKEN_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_TOKEN_STORE_PATH;
}

export function readTokens(): SpotifyTokenRecord | null {
  const storePath = getTokenStorePath();
  if (!fs.existsSync(storePath)) return null;

  try {
    const raw = fs.readFileSync(storePath, "utf8");
    return JSON.parse(raw) as SpotifyTokenRecord;
  } catch (err) {
    console.warn(
      `[spotify/tokenStore] kon ${storePath} niet lezen, behandel als niet-verbonden:`,
      err
    );
    return null;
  }
}

export function writeTokens(tokens: SpotifyTokenRecord): void {
  const storePath = getTokenStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(tokens, null, 2), "utf8");
}

export function clearTokens(): void {
  const storePath = getTokenStorePath();
  if (fs.existsSync(storePath)) {
    fs.rmSync(storePath);
  }
}
