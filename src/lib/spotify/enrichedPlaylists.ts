// Fase 4: de verrijkte leeslaag. Leest de snapshot (fase 3) + de done-status (los bestand, zie
// doneStore.ts) en levert per playlist het VOLLEDIGE verrijkte object: de originele Spotify-velden
// + de geparsede naam-dimensies (parsePlaylistName.ts) + de canonieke Plutchik-emotie
// (plutchikColors.ts) + de done-status. Dit is precies wat fase 5 (de flexibele filter/groepeer-UI)
// straks consumeert -- fase 4 bouwt hier bewust GEEN UI bovenop (zie de opdracht).
//
// Owner-filter: alleen Dave's eigen playlists (owner.id === ownerUserId uit privateRules.ts) doen mee in de
// systematische reconstructie. Playlists van anderen (gevolgd, niet bezeten) en de handvol namen
// die in geen enkel herkend patroon vallen (parsePlaylistName().matched === false) worden niet
// geforceerd -- ze krijgen een duidelijke `sortBucket: "ongesorteerd"` zodat fase 5 ze apart kan
// tonen in plaats van kapot te proberen groeperen.
//
// SERVER-ONLY (via snapshotStore.ts/doneStore.ts, gebruikt fs).

import { readSnapshot } from "./snapshotStore";
import { getDoneStatus, readDoneStatuses } from "./doneStore";
import { parsePlaylistName, type ParsedPlaylistName } from "./parsePlaylistName";
import { colorToEmotion } from "./plutchikColors";
import { classifyWorld, type SpotifyWorld } from "./classifyWorld";
import { getWorldOverride, readWorldOverrides } from "./worldStore";
import { classifyMmcBpm, type MmcBpmTier } from "./classifyBpm";
import { getBpmOverride, readBpmOverrides } from "./bpmStore";
import { readPrivateRules, type PrivateRules } from "./privateRules";
import type { Playlist, Snapshot } from "./types";

export interface EnrichedPlaylist extends Omit<Playlist, "tracks"> {
  /** Is dit een playlist die Dave zelf bezit, of eentje die hij alleen volgt? Losstaand van
   *  Spotify's eigen `owner`-veld (dat blijft de ruwe {id, displayName}). */
  ownerBucket: "dave" | "other";
  parsed: ParsedPlaylistName;
  /** Canonieke Plutchik-emotie voor `parsed.color`, of null zonder herkende kleur. */
  emotion: string | null;
  done: boolean;
  /** "gesorteerd": eigen playlist + herkend patroon (parsed.matched). "ongesorteerd": alles
   *  anders (niet-eigen, of een eigen playlist die in geen enkel patroon past) -- fase 5's
   *  aparte "overig"-weergave. */
  sortBucket: "gesorteerd" | "ongesorteerd";
  /** Effectieve wereld: de handmatige correctie (worldStore.ts) als die bestaat, anders de
   *  auto-classificatie (classifyWorld.ts). Ontstaan uit de "werelden"-laag (sub-routes per
   *  top-folder) -- zie world = override ?? classifyWorld(...) in enrichPlaylist() hieronder. */
  world: SpotifyWorld;
  /** Wat classifyWorld zonder handmatige correctie zou raden. Server-side berekend, zodat de
   *  wereld-reset in PlaylistManager.tsx de privé-regels (privateRules.ts) niet naar de browser
   *  hoeft te halen. */
  autoWorld: SpotifyWorld;
  /** True zodra er een handmatige correctie voor deze playlist is vastgelegd -- ongeacht of die
   *  toevallig samenvalt met wat de auto-classificatie al zou geraden hebben. Stuurt het
   *  subtiele merkteken in de correctie-UI (PlaylistManager.tsx). */
  worldIsOverridden: boolean;
  /** Effectieve BPM binnen MMC: de handmatige correctie (bpmStore.ts) als die bestaat, anders de
   *  auto-classificatie (classifyBpm.ts). Null als geen enkele regel toepast ("overig/onbekend").
   *  Alleen betekenisvol voor MMC-playlists (de vier BPM-sub-routes filteren hierop), maar voor
   *  ELKE playlist berekend -- classifyMmcBpm is een kale, herbruikbare afleiding zonder aanname
   *  dat de playlist al MMC is (zelfde opzet als `world`/classifyWorld hierboven). */
  mmcBpm: MmcBpmTier | null;
  /** True zodra er een handmatige BPM-correctie voor deze playlist is vastgelegd -- zelfde
   *  merkteken-logica als worldIsOverridden hierboven. */
  mmcBpmIsOverridden: boolean;

  // `tracks` bewust weggelaten -- de verrijkte leeslaag is bedoeld voor het overzicht/filteren op
  // playlist-niveau (fase 5), niet om honderden playlists mét al hun tracks in het geheugen te
  // laden. Wie de tracks nodig heeft, leest de snapshot rechtstreeks via snapshotStore.ts.
}

export interface EnrichedSnapshot {
  syncedAt: string;
  playlists: EnrichedPlaylist[];
}

function enrichPlaylist(
  playlist: Playlist,
  doneStatus: boolean,
  worldOverride: SpotifyWorld | null,
  bpmOverride: MmcBpmTier | null,
  rules: PrivateRules
): EnrichedPlaylist {
  const ownerBucket: "dave" | "other" =
    rules.ownerUserId !== null && playlist.owner.id === rules.ownerUserId ? "dave" : "other";
  const parsed = parsePlaylistName(playlist.name);
  const emotion = colorToEmotion(parsed.color);
  const sortBucket: "gesorteerd" | "ongesorteerd" =
    ownerBucket === "dave" && parsed.matched ? "gesorteerd" : "ongesorteerd";
  const autoWorld = classifyWorld({ name: playlist.name, ownerBucket, parsed }, rules);
  const world = worldOverride ?? autoWorld;
  const mmcBpm = bpmOverride ?? classifyMmcBpm({ name: playlist.name, parsed });

  const { tracks: _tracks, ...meta } = playlist;
  void _tracks;

  return {
    ...meta,
    ownerBucket,
    parsed,
    emotion,
    done: doneStatus,
    sortBucket,
    world,
    autoWorld,
    worldIsOverridden: worldOverride !== null,
    mmcBpm,
    mmcBpmIsOverridden: bpmOverride !== null,
  };
}

// Leest de laatste snapshot + de done-store + de wereld-/BPM-overrides en levert de verrijkte
// playlists. Geeft null terug als er nog geen snapshot is (nog geen sync gedraaid, zie
// ingest.ts/de /spotify-playlist manager).
//
// Accepteert optioneel een AL-gelezen Snapshot (of expliciet null) i.p.v. zelf readSnapshot() aan
// te roepen -- voor aanroepers die de snapshot toch al voor iets anders van schijf haalden (bv.
// het data-dashboard, dat 'm ook voor dedup/top-artiesten nodig heeft) en 'm niet nog een keer
// willen parsen, zelfde "lees 'm één keer"-conventie als /spotify/page.tsx. Zonder argument (dus
// bij een aanroep als `getEnrichedSnapshot()`) blijft het gedrag ongewijzigd: zelf lezen.
export function getEnrichedSnapshot(preloadedSnapshot?: Snapshot | null): EnrichedSnapshot | null {
  const snapshot = preloadedSnapshot === undefined ? readSnapshot() : preloadedSnapshot;
  if (!snapshot) return null;

  const doneStatuses = readDoneStatuses();
  const worldOverrides = readWorldOverrides();
  const bpmOverrides = readBpmOverrides();
  const rules = readPrivateRules();
  return {
    syncedAt: snapshot.syncedAt,
    playlists: snapshot.playlists.map((p) =>
      enrichPlaylist(
        p,
        doneStatuses[p.id]?.done ?? false,
        worldOverrides[p.id]?.world ?? null,
        bpmOverrides[p.id]?.bpm ?? null,
        rules
      )
    ),
  };
}

// Verrijkt één playlist op basis van zijn actuele done-status + wereld-/BPM-override (los
// aanroepbaar, bv. na een enkele API-call die maar één playlist nodig heeft in plaats van de hele
// snapshot). Bewust vooruitgebouwd: nog geen aanroeper in de app zelf (die werkt vooralsnog altijd
// via de volledige snapshot, zie getEnrichedSnapshot hierboven), maar wel al gedekt door zijn
// eigen test.
export function enrichSinglePlaylist(playlist: Playlist): EnrichedPlaylist {
  return enrichPlaylist(
    playlist,
    getDoneStatus(playlist.id),
    getWorldOverride(playlist.id),
    getBpmOverride(playlist.id),
    readPrivateRules()
  );
}
