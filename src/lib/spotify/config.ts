// Config-laag voor de Spotify-integratie: leest de env-vars en valideert ze op één centrale
// plek, zodat elke route handler dezelfde nette foutmelding krijgt bij een ontbrekende/foute
// waarde in plaats van een cryptische crash. SPOTIFY_CLIENT_SECRET heeft bewust GEEN
// NEXT_PUBLIC_-prefix en mag nooit in de clientbundel belanden -- deze module mag daarom alleen
// vanuit server-side code (route handlers, andere lib-bestanden) geïmporteerd worden, nooit
// vanuit een 'use client'-bestand.

import path from "path";
import { getOneDriveEnvPath, recoverEnvFromOneDrive } from "../env/onedriveEnv";
import { SpotifyConfigError } from "./errors";

export const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// Scopes. Dit project was tot 2026-07-25 volledig **read-only**: het haalde nooit meer op dan het mocht
// lezen (zie het dossier, §1). Die grens is op Dave's verzoek verschoven voor precies één ding: het mix-ID
// als `mix:YYYYMMDD` in de **beschrijving** van een eigen MMC-playlist zetten, zodat de brug op een harde
// sleutel kan koppelen i.p.v. op de tracklist-heuristiek (zie mixes/mixIdTag.ts).
//
// De grens is daarmee smal gehouden, en dat is bewust:
//   * `playlist-modify-private` + `-public` geven toegang tot de playlist-METADATA (naam, beschrijving,
//     openbaarheid). De hub gebruikt daarvan alléén de beschrijving en de naam.
//   * De schrijfacties naar Spotify staan allemaal in playlistApi.ts: `updatePlaylistDescription()` en
//     `updatePlaylistName()` raken uitsluitend `description` resp. `name`, `reorderPlaylistItem()` (sinds 31
//     oktober 2026, Dave) alleen de VOLGORDE van de tracks in een werkbak, en `addPlaylistItems()` +
//     `removePlaylistItems()` (sinds 7 november 2026, Dave, #134) verplaatsen een track van de ene werkbak naar
//     een andere -- de enige plek waar een track ergens bij komt of weggaat, en alleen tussen werkbakken
//     (api/spotify/playlist-move).
//   * Niet gevraagd blijven o.a. `user-library-modify`, `ugc-image-upload` en alle playback-scopes.
//
// LET OP bij een wijziging hier: een uitgebreidere scope-set geldt pas na opnieuw inloggen. Een bestaand
// refresh-token houdt de scopes waarmee het is uitgegeven.
export const SPOTIFY_SCOPES =
  "playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public";

// Moet EXACT overeenkomen met de redirect-URI die in het Spotify Developer Dashboard staat
// geregistreerd. LET OP: 127.0.0.1, niet localhost -- Spotify weigert localhost sinds 2025 (zie
// het dossier, §1/§6).
export const DEFAULT_SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback/spotify";

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Alléén de redirect-URI, zónder de client-id/secret-validatie van `getSpotifyConfig()`.
 *
 *  Bestaat voor de host-check op de statuspagina (zie redirectHost.ts): die wil weten op welke host de
 *  callback zal binnenkomen, ook wanneer er nog geen client-id is ingevuld. `getSpotifyConfig()` gooit
 *  dan, en een ontbrekende sleutel hoort de host-waarschuwing niet te onderdrukken -- juist bij het
 *  eerste opzetten heb je hem nodig. */
export function getSpotifyRedirectUri(): string {
  return process.env.SPOTIFY_REDIRECT_URI || DEFAULT_SPOTIFY_REDIRECT_URI;
}

/** De standaard-herstelpoging bij ontbrekende sleutels (#128): de OneDrive-kopie alsnog overnemen en in
 *  `process.env` laden. `predev` doet dat maar één keer, en bij het opstarten is OneDrive vaak nog bezig. */
export function recoverSpotifyEnv(): void {
  recoverEnvFromOneDrive(path.resolve(process.cwd(), ".env.local"), getOneDriveEnvPath());
}

/** `recoverEnv` draait alleen als een sleutel ontbreekt; tests geven een eigen (of lege) mee, zodat ze nooit
 *  de echte .env.local van de machine inlezen. */
export function getSpotifyConfig(recoverEnv: () => void = recoverSpotifyEnv): SpotifyConfig {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) recoverEnv();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = getSpotifyRedirectUri();

  if (!clientId || !clientSecret) {
    throw new SpotifyConfigError(
      "SPOTIFY_CLIENT_ID en/of SPOTIFY_CLIENT_SECRET ontbreken. Zet je ingevulde .env.local in " +
        "%OneDrive%\\dkj-solutions\\dkj-music-library -- staat hij daar al (OneDrive kan nog aan het " +
        "synchroniseren zijn), probeer het dan zo opnieuw, of draai `npm run env:onedrive` (zie de README, 'Starten')."
    );
  }

  if (redirectUri.includes("localhost")) {
    // Vroeg falen met een duidelijke melding is beter dan een cryptische INVALID_CLIENT-response
    // van Spotify pas bij de login-redirect.
    throw new SpotifyConfigError(
      "SPOTIFY_REDIRECT_URI bevat 'localhost' -- Spotify accepteert dit niet meer sinds 2025. " +
        "Gebruik 127.0.0.1, bv. http://127.0.0.1:3000/api/auth/callback/spotify."
    );
  }

  return { clientId, clientSecret, redirectUri };
}
