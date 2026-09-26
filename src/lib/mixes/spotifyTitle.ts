// DE PLAYLISTNAAM ALS SPIEGEL VAN DE MIX-JSON (Dave, 2026-08-11).
//
// De mix-bron draagt sinds 2026-07-26 een veld `title_spotify`: de exacte playlistnaam die bij die mix
// hoort. Dave's opdracht: "ik wil dat alle titels in Spotify dezelfde titel krijgen als in djcylow".
// Dit bestand bepaalt wát die naam dan is -- de formatter -- en, net zo belangrijk, wanneer hij nog
// NIET geschreven mag worden.
//
// Zelfde rolverdeling als mixDescription.ts voor de beschrijving: pure module (geen fs, geen React),
// formatter en vergelijking samen in één bestand, zodat wat de hub schrijft per definitie is wat de hub
// kan lezen. Het verschil met de beschrijving is de richting van het gezag: de beschrijving wordt door
// de hub SAMENGESTELD uit velden, de naam wordt LETTERLIJK overgenomen. De bron dicteert hem.
//
// TWEE BEWERKINGEN, EN VERDER NIETS -- allebei omdat de bron op dit moment niet één vorm heeft:
//
//  1. HET DATUMSTAARTJE GAAT ERAF. Op `main` van djcylow-react eindigt elke waarde op een kleur-emoji
//     plus het mix-ID ("... 🟡 Vol. 1 🟡 20260303"); de branch `data/title-spotify-zonder-datum`
//     (commit b42083f) haalt dat er bij alle 77 uit. Dave heeft de vorm ZONDER staartje gekozen
//     (2026-08-11), en zijn eigen commit-message zegt waarom: de datum hoort in `id`/`id_spotify`, niet
//     in een titel die luisteraars zien. Zolang die branch niet gemerged is, staat de oude vorm nog op
//     schijf -- dus normaliseert de hub. Ná de merge is deze bewerking een no-op, geen dode code: hij
//     blijft precies zolang nodig als er nog één bestand met een staartje bestaat.
//
//  2. EEN VERKEERDE KLEUR-EMOJI BLOKKEERT DE SCHRIJFACTIE, hij wordt NIET stil gecorrigeerd. Alle
//     Cyan-entries in de bron dragen 💠 (U+1F4A0) waar Dave's playlists 🧊 (U+1F9CA) gebruiken; de zes
//     andere kleuren kloppen wél. Dave heeft vastgesteld dat de bron daar fout zit en dat hij het daar
//     rechtzet. Dat is waarom dit een blokkade is en geen vertaling: stil corrigeren zou een fout in de
//     bron onzichtbaar maken en de twee bronnen permanent laten verschillen. Zes van de 48 gekoppelde
//     playlists staan hierdoor tijdelijk stil; ze lopen mee zodra de bron klopt, zonder codewijziging.
import { PLUTCHIK_COLOR_EMOJI, PLUTCHIK_COLORS, type PlutchikColor } from "@/lib/spotify/plutchikColors";
import type { Mix } from "./types";

/** Het staartje dat bewerking 1 hierboven weghaalt: witruimte, een optionele emoji (met optionele
 *  variatieselector) en acht cijfers, aan het EIND van de titel.
 *
 *  Het anker `$` is wat dit veilig maakt: acht cijfers midden in een titel blijven staan. Zou de datum
 *  ooit vooraan komen, dan valt dat op als een niet-gelijke naam -- niet als een stille verminking. */
const DATUM_STAARTJE = new RegExp("\\s*\\p{Extended_Pictographic}?\\uFE0F?\\s*\\d{8}\\s*$", "u");

/** De ruwe `title_spotify`-waarde uit de JSON, genormaliseerd naar de vorm die Dave gekozen heeft.
 *
 *  Hier gebeurt bewerking 1 (het datumstaartje) en niets anders: witruimte samenvouwen zodat een dubbele
 *  spatie in de bron geen "afwijkende naam" oplevert, en de rest letterlijk laten staan. Een lege of
 *  ontbrekende waarde levert `null`. Aangeroepen door de leeslaag (mixStore.ts), zodat de rest van de app
 *  alleen nog de genormaliseerde vorm ziet. */
export function normalizeSpotifyTitle(raw: string | undefined | null): string | null {
  const schoon = (raw ?? "").replace(DATUM_STAARTJE, "").replace(/\s+/g, " ").trim();
  return schoon === "" ? null : schoon;
}

/** Waarom de doelnaam van deze mix (nog) niet naar Spotify mag, of `null` als er niets in de weg staat.
 *
 *  Eén reden per keer, de belangrijkste eerst -- de aanroeper toont hem letterlijk aan Dave, dus het is
 *  een uitleg en geen foutcode. */
export function titleBlocker(mix: Mix): string | null {
  const titel = mix.spotifyTitle;
  if (titel === null) {
    return "Deze mix heeft geen title_spotify in de bron, dus er is geen naam om over te nemen.";
  }

  // De LENGTE wordt hier bewust niet gewogen: dat is een grens van de Spotify-API en die staat bij de
  // schrijfactie zelf (PLAYLIST_NAME_MAX in spotify/playlistApi.ts, dat hem afwijst). Hem hier herhalen
  // zou dezelfde grens op twee plekken zetten, en dit bestand aan de fetch-laag knopen die het juist
  // niet nodig heeft.
  const verkeerd = verkeerdeKleurEmoji(titel, mix.color);
  if (verkeerd) {
    const juist = mix.color ? PLUTCHIK_COLOR_EMOJI[mix.color] : "?";
    return (
      `De naam draagt ${verkeerd} als kleur-emoji, maar ${mix.color ?? "deze kleur"} is ${juist} in deze app ` +
      `en in je playlists. Dat is een fout in de mix-bron (djcylow-react) -- zet hem daar recht, dan loopt ` +
      `deze playlist mee zonder dat hier iets hoeft te veranderen.`
    );
  }

  return null;
}

/** De emoji in de titel die vóór een kleur doorgaat maar niet DE emoji van deze kleur is, of `null`.
 *
 *  Alleen emoji's die in de canonieke tabel voorkomen worden gewogen: een titel mag verder elke emoji
 *  dragen zonder dat dit iets vindt. Wat het wél vindt, is precies de 💠/🧊-verwisseling -- en, mocht de
 *  bron ooit een andere kleur verhaspelen, ook die. */
function verkeerdeKleurEmoji(titel: string, kleur: PlutchikColor | null): string | null {
  if (kleur === null) return null;

  const juist = PLUTCHIK_COLOR_EMOJI[kleur];
  if (titel.includes(juist)) return null;

  for (const andere of PLUTCHIK_COLORS) {
    if (andere === kleur) continue;
    if (titel.includes(PLUTCHIK_COLOR_EMOJI[andere])) return PLUTCHIK_COLOR_EMOJI[andere];
  }

  // 💠 (U+1F4A0) is de concrete verwisseling die dit mechanisme aanleiding gaf: hij hoort bij géén
  // kleur, dus de lus hierboven vindt hem niet. Expliciet benoemd omdat hij in de hele bron staat en de
  // melding anders zou zwijgen over de enige afwijking die er nu ís.
  const NIET_VAN_ONS = "\u{1F4A0}";
  if (titel.includes(NIET_VAN_ONS)) return NIET_VAN_ONS;

  // Geen kleur-emoji in de titel is geen blokkade: de bron mag een naam zonder emoji leveren.
  return null;
}

export type TitleState =
  /** De playlist heet al precies zoals de bron zegt. */
  | "in-sync"
  /** De naam wijkt af en is met één schrijfactie gelijk te trekken. */
  | "outdated"
  /** Er valt niets te vergelijken: de bron levert geen naam, of hij mag nog niet geschreven worden. */
  | "blocked";

/** Hoe de naam van een playlist zich verhoudt tot de mix waaraan hij gekoppeld is.
 *
 *  Anders dan bij de beschrijving is dit een LETTERLIJKE vergelijking, geen veld-voor-veld. De bron
 *  dicteert de naam exact, dus elk verschil -- ook een spatie -- is een verschil. De normalisatie
 *  hierboven vangt de verschillen af die géén verschil zijn (witruimte, het datumstaartje). */
export function compareTitle(
  playlistName: string,
  mix: Mix
): { state: TitleState; target: string | null; blocker: string | null } {
  const blocker = titleBlocker(mix);
  if (blocker !== null) return { state: "blocked", target: mix.spotifyTitle, blocker };

  const target = mix.spotifyTitle;
  return { state: playlistName === target ? "in-sync" : "outdated", target, blocker: null };
}
