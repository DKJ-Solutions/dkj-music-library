// BPM-classifier voor de MMC-wereld (Music Mood Colours, zie classifyWorld.ts). Sinds de tweede
// classifyWorld-bijstelling (2026-07-23) bestaat MMC nog uitsluitend uit Dave's genummerde mixen
// (House Mix / Drum & Bass (Mix), altijd met een Vol.-nummer) -- dit bestand splitst díe subset
// verder op naar BPM, zodat de vier BPM-sub-routes (96/112/128/176bpm) elk hun eigen, gerichte
// subset tonen.
//
// Bewust een EIGEN, PURE functie naast classifyWorld.ts (zelfde stijl: geen fs hier, makkelijk te
// testen) in plaats van er nog een tak in classifyWorld.ts van te maken -- twee losse, kleine
// vragen ("welke wereld?" / "welke BPM binnen MMC?") blijven zo apart leesbaar en testbaar, ook al
// werken ze op dezelfde geparsede naam-dimensies.
//
// Prioriteitsvolgorde (zie ook classifyBpm.test.ts):
//   1. Twee expliciete naam-uitzonderingen (dezelfde twee playlists als classifyWorld.ts's
//      MMC_NAME_EXCEPTION_PATTERN -- zie de opdracht: Dave kent ze allebei een vaste BPM toe, los
//      van wat de naam verder aan BPM-informatie draagt).
//   2. typeLabel === "House Mix" -> 128 (Dave's vaste BPM voor de House Mix-familie).
//   3. typeLabel === "Drum & Bass (Mix)" -> 176 (Dave's vaste BPM voor de Drum & Bass-familie).
//   4. Een expliciete BPM in de naam zelf (parsed.bpm, bv. "112BPM") die toevallig één van de vier
//      bekende MMC-tiers is -- vangnet voor een MMC-playlist die (nog) geen herkend typeLabel heeft
//      maar wel een bruikbare BPM-annotatie draagt.
//   5. Geen enkele regel van toepassing -> null ("overig/onbekend" -- de aanroeper toont dit als
//      een aparte, corrigeerbare groep; zou in de praktijk vrijwel leeg moeten zijn, zie de
//      opdracht).
//
// Werkt op typeLabel/bpm uit ParsedPlaylistName (parsePlaylistName.ts) + de rauwe naam (voor de
// twee naam-uitzonderingen) -- geen aanname dat de playlist al MMC is: de aanroeper (WorldPage/
// BpmPage/enrichedPlaylists.ts) scoped dit altijd tot de MMC-subset, maar deze functie zelf is een
// kale, herbruikbare afleiding, net als classifyWorld.ts.
import type { ParsedPlaylistName } from "./parsePlaylistName";

/** De vier BPM-tiers die Dave binnen MMC onderscheidt -- gedeeld door de vier sub-routes, de
 *  BPM-correctie-select en de overzichts-tellers op /spotify/musicmoodcolours. */
export const MMC_BPM_TIERS = [96, 112, 128, 176] as const;
export type MmcBpmTier = (typeof MMC_BPM_TIERS)[number];

/** Vaste presentatie-metadata per BPM-tier -- label + route, zelfde recept als WORLD_META in
 *  classifyWorld.ts. */
export const BPM_TIER_META: Record<MmcBpmTier, { label: string; href: string }> = {
  96: { label: "96 BPM", href: "/spotify/musicmoodcolours/96bpm" },
  112: { label: "112 BPM", href: "/spotify/musicmoodcolours/112bpm" },
  128: { label: "128 BPM", href: "/spotify/musicmoodcolours/128bpm" },
  176: { label: "176 BPM", href: "/spotify/musicmoodcolours/176bpm" },
};

function isMmcBpmTier(value: number): value is MmcBpmTier {
  return (MMC_BPM_TIERS as readonly number[]).includes(value);
}

/** Wat de classifier nodig heeft -- zelfde smalle-projectie-recept als ClassifiableWorldPlaylist
 *  in classifyWorld.ts. */
export interface ClassifiableBpmPlaylist {
  name: string;
  parsed: Pick<ParsedPlaylistName, "typeLabel" | "bpm">;
}

// Regel 1. Dezelfde twee met-naam-genoemde uitzonderingen als classifyWorld.ts's
// MMC_NAME_EXCEPTION_PATTERN -- hier los gehouden (niet ge-import) omdat de twee bestanden allebei
// zelfstandig leesbaar/testbaar moeten blijven en de twee namen toch als aparte if-branches met een
// eigen BPM-waarde behandeld worden (geen gedeelde "match -> zelfde uitkomst"-vorm zoals bij
// classifyWorld.ts's ene MMC_NAME_EXCEPTION_PATTERN).
const HAPPY_LOFI_BEATS_PATTERN = /happy\s+lofi\s+beats/i;
const NEW_DEEP_HOUSE_MIX_PATTERN = /new\s+deep\s+house\s+mix/i;

export function classifyMmcBpm(playlist: ClassifiableBpmPlaylist): MmcBpmTier | null {
  const { name, parsed } = playlist;

  if (HAPPY_LOFI_BEATS_PATTERN.test(name)) return 96;
  if (NEW_DEEP_HOUSE_MIX_PATTERN.test(name)) return 112;

  if (parsed.typeLabel === "House Mix") return 128;
  if (parsed.typeLabel === "Drum & Bass (Mix)") return 176;

  if (parsed.bpm !== null && isMmcBpmTier(parsed.bpm)) return parsed.bpm;

  return null;
}
