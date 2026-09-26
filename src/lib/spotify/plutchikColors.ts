// Canonieke kleur -> emotie-mapping, 1-op-1 overgenomen uit de Plutchik-brain
// (life-hub (privé): Brains/plutchik-brain/emotie/{positief,negatief}/... -- zie o.a.
// life-hub (privé): Brains/plutchik-brain/emotie/HIPPOCAMPUS.md voor de acht kleuren: Red, Orange, Yellow, Green, Cyan, Blue,
// Purple, Magenta). De brain is en blijft de bron van waarheid; dit is een bewuste, hardgecodeerde
// AFGELEIDE kopie voor de app -- er wordt hier NIET live uit Brains/ gelezen of naar geschreven.
//
// Vastgesteld via Dave/Chris bij de opdracht voor fase 4 van de Spotify playlist manager.

export const PLUTCHIK_COLORS = [
  "Cyan",
  "Green",
  "Yellow",
  "Orange",
  "Red",
  "Magenta",
  "Purple",
  "Blue",
] as const;

export type PlutchikColor = (typeof PLUTCHIK_COLORS)[number];

export const PLUTCHIK_COLOR_EMOTIONS: Record<PlutchikColor, string> = {
  Cyan: "Vermaak",
  Green: "Dankbaar",
  Yellow: "Ambitieus",
  Orange: "Hoopvol",
  Red: "Bang",
  Magenta: "Geïrriteerd",
  Purple: "Verdrietig",
  Blue: "Onverschillig",
};

/** De CANONIEKE emoji per kleur, zoals Dave ze in zijn playlistnamen gebruikt.
 *
 *  Dit is de bron van waarheid voor beide richtingen: parsePlaylistName.ts leidt zijn (tolerante)
 *  herken-patronen hieruit af, en mixes/spotifyTitle.ts controleert er een titel uit de mix-bron tegen
 *  vóórdat die naar Spotify gaat.
 *
 *  LET OP DE TWEE AFWIJKENDE. Zes kleuren zijn een gekleurde cirkel; Cyan is 🧊 en Magenta ♦️. Dat is
 *  geen esthetische keuze maar een beperking van de emoji-set: er bestaat geen cyaan of magenta cirkel.
 *
 *  WAAROM DIT ER STAAT (Dave, 2026-08-11). De mix-JSON's in `djcylow-react` schrijven Cyan als 💠
 *  (U+1F4A0) terwijl Dave's playlists en deze app 🧊 (U+1F9CA) gebruiken -- alle zes andere kleuren
 *  komen wél overeen. Dave heeft vastgesteld dat de bron daar fout zit en dat hij dat daar rechtzet;
 *  zolang dat niet gebeurd is, weigert spotifyTitle.ts zo'n titel in plaats van de verkeerde emoji in
 *  zijn Spotify-account te zetten. Zonder deze tabel zou zo'n afwijking pas opvallen in de naam zelf. */
export const PLUTCHIK_COLOR_EMOJI: Record<PlutchikColor, string> = {
  Cyan: "\u{1F9CA}",
  Green: "\u{1F7E2}",
  Yellow: "\u{1F7E1}",
  Orange: "\u{1F7E0}",
  Red: "\u{1F534}",
  Magenta: "\u{2666}\u{FE0F}",
  Purple: "\u{1F7E3}",
  Blue: "\u{1F535}",
};

// Bewust vooruitgebouwd: nog geen aanroeper in de app zelf (parsePlaylistName.ts vergelijkt al
// tegen PLUTCHIK_COLORS zelf), maar een handige, al-geteste type-guard voor een toekomstige plek
// waar een losse string (bv. uit een toekomstige instellingen-UI) gevalideerd moet worden.
export function isPlutchikColor(value: string): value is PlutchikColor {
  return (PLUTCHIK_COLORS as readonly string[]).includes(value);
}

// Geeft de canonieke Plutchik-emotie voor een kleur, of null als er geen kleur is (bv. een
// playlist-naam waarin geen kleur kon worden herkend).
export function colorToEmotion(color: PlutchikColor | null): string | null {
  return color ? PLUTCHIK_COLOR_EMOTIONS[color] : null;
}
