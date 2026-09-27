// De brug omgedraaid, voor de playlist-tabel: waar mixLinks.ts vraagt "welke playlist hoort bij deze
// mix?", levert dit bestand de opzoektabel de andere kant op -- "welke mix hoort bij deze playlist?".
// Daarmee kan PlaylistManager per rij het mix-ID, het genre en het subgenre tonen zonder zelf iets
// van de mix-bron te weten (het is een Client Component en mag niet aan fs).
//
// TWEE LAGEN, zelfde rolverdeling als matchMixes.ts tegenover mixLinks.ts: `buildPlaylistMixIndex()` is
// de pure omzetting van koppelingen naar de opzoektabel (geen fs, dus toetsbaar), en
// `getPlaylistMixIndex()` is het SERVER-ONLY laagje eromheen dat de koppelingen van schijf haalt. Die
// laatste is alleen aan te roepen vanuit een Server Component (WorldPage.tsx, BpmPage.tsx,
// app/spotify/page.tsx), die het resultaat als platte prop doorgeeft.
import type { PlutchikColor } from "@/lib/spotify/plutchikColors";
import { getMixLinks } from "./mixLinks";
import type { MixLink } from "./matchMixes";
import {
  compareDescription,
  type DescriptionFieldDiff,
  type DescriptionState,
} from "./mixDescription";
import { compareTitle, type TitleState } from "./spotifyTitle";
import { genreToFamily, isGenreFamily, type GenreFamily } from "./genreFamilies";

/** Wat een playlist-rij van zijn gekoppelde mix overneemt -- Dave's drietrapsindeling plus het ID. */
export interface PlaylistMixInfo {
  /** Het `id`-veld uit de mix-JSON (`YYYYMMDD` bij echte mixen). */
  mixId: string;
  /** De bovenste laag (EDM/ROCK/POP/ALT), afgeleid uit genre/subgenre -- zie genreFamilies.ts. */
  family: GenreFamily | null;
  /** De middenlaag (House/Drum & Bass/Techno/Nu-Disco), rechtstreeks uit de JSON. */
  genre: string | null;
  /** De fijnste laag (Tech House/Liquid Drum & Bass/Melodic Techno), rechtstreeks uit de JSON. */
  subgenre: string | null;
  /** Hóé deze rij aan zijn mix komt: `"declared-id"` = de playlistbeschrijving noemt het ID zelf (harde
   *  sleutel, zie mixIdTag.ts), `"tracklist"` = de containment-heuristiek. Praktisch het werklijstje voor
   *  de tags: alles op `"tracklist"` mist er nog een. */
  matchedBy: "declared-id" | "tracklist";
  /** Hoe de playlistbeschrijving zich verhoudt tot de mix-JSON: `"missing"` (nog nooit geschreven),
   *  `"in-sync"` (klopt veld voor veld) of `"outdated"` (staat er, maar wijkt af -- de JSON is
   *  bijgewerkt ná het schrijven). Zie compareDescription in mixDescription.ts.
   *
   *  Dit is een fijnere maat dan `matchedBy`: een beschrijving kán het juiste ID dragen en tóch een
   *  verouderd `Vol.`-nummer of subgenre tonen. `matchedBy` zegt of de koppeling hard is, dit veld of de
   *  inhoud klopt. */
  descriptionState: DescriptionState;
  /** Bij `"outdated"`: welke velden afwijken en wat er zou moeten staan. Leeg bij de andere standen. */
  descriptionDiffs: DescriptionFieldDiff[];
  /** Hoe de NAAM van deze playlist zich verhoudt tot `title_spotify` in de mix-bron: `"in-sync"` (heet al
   *  zo), `"outdated"` (wijkt af, met één schrijfactie gelijk te trekken) of `"blocked"` (de bron levert
   *  geen naam, of de naam mag nog niet geschreven worden -- zie `titleBlocker`). Zie spotifyTitle.ts.
   *
   *  Los van `descriptionState`: de beschrijving en de naam zijn twee verschillende velden op Spotify, met
   *  elk hun eigen schrijfroute. Een playlist kan een kloppende spiegel in de beschrijving hebben en tóch
   *  nog de oude naam dragen -- dat is precies de stand waarin alle 48 gekoppelde playlists staan. */
  titleState: TitleState;
  /** De naam die deze playlist hoort te dragen, of `null` als de bron er geen levert. Ook gevuld bij
   *  `"in-sync"` (dan is hij gelijk aan de huidige naam) -- de UI toont hem in de tooltip. */
  titleTarget: string | null;
  /** Bij `"blocked"`: waarom de naam nog niet geschreven kan worden, in Dave's eigen taal. Null bij de
   *  andere standen. */
  titleBlocker: string | null;
}

/** Een mix uit de DJ Cylow-bron die in de playlist-tabel niet voorkomt: er is geen playlist die hem
 *  exclusief weerspiegelt, dus geen rij die zijn ID kan tonen. Dit is het verschil dat de sync-check
 *  meldt, uitgesplitst per mix. */
export interface MissingMix {
  mixId: string;
  title: string;
  color: PlutchikColor | null;
  density: "Full" | "Light" | null;
  gender: "f" | "m" | null;
  volume: number | null;
  genre: string | null;
  subgenre: string | null;
  /** De ÉCHTE BPM uit de mix-bestandsnaam -- een feit, niet de gok die de playlist-kant maakt. */
  bpm: number | null;
  /** Aantal tracks in de mix-tracklist. */
  trackCount: number;
  /** `"bucket-only"` = de tracks staan wél op Spotify, maar alleen in een grote kleur-emmer.
   *  `"unmatched"` = geen enkele playlist bevat deze tracklijst.
   *  `"claimed-by-other-mix"` = de best passende playlist draagt in zijn beschrijving de `mix:`-tag van
   *  een ándere, bestaande mix. Die tag is de harde sleutel en gaat vóór, dus die playlist is niet van
   *  déze mix -- en een eigen playlist heeft hij daarmee niet (zie DeclaredIdConflict in matchMixes.ts). */
  reason: "bucket-only" | "unmatched" | "claimed-by-other-mix";
  /** Bij `"bucket-only"`: de emmer waarin de tracks zijn teruggevonden. Null bij de andere redenen. */
  bucketName: string | null;
  /** Bij `"claimed-by-other-mix"`: de playlist die door een andere mix geclaimd wordt, met het mix-ID
   *  dat zijn beschrijving noemt. Null bij de andere redenen. */
  claimedBy: { mixId: string; playlistName: string } | null;
}

export interface PlaylistMixIndex {
  /** De opzoektabel: mix-info per Spotify-playlist-id. */
  byPlaylistId: Record<string, PlaylistMixInfo>;
  /** De mixen die in de tabel ontbreken, nieuwste ID eerst. */
  missingMixes: MissingMix[];
  /** Aantal publieke mixen in de bron (`djcylow-react`) met een gevuld `id`-veld -- de noemer waartegen
   *  de tabel haar eigen "met ID"-teller afzet. Legacy-entries zonder `id` tellen niet mee: die kunnen
   *  per definitie geen ID in de tabel opleveren, dus meerekenen zou een verschil laten zien dat
   *  onoplosbaar is.
   *
   *  `null` als er geen enkele mix binnenkwam -- de bron is niet gevonden (of leeg). Dan is er niets om
   *  tegen af te zetten, en een `0` zou op de pagina lezen als "de bron telt nul mixen". Zo verbergt de
   *  tegel zich, net als de "met ID"-tegel (zie `geenMixBron` in PlaylistManager.tsx). */
  mixesWithId: number | null;
}

/** Waarom deze mix géén eigen rij in de playlist-tabel kan krijgen, of `null` als hij er wél een heeft.
 *
 *  De derde reden is de tegenspraak-variant en gaat vóór de status: de heuristiek vond wél een playlist,
 *  maar die draagt de `mix:`-tag van een ándere bestaande mix. Die tag is de harde sleutel en gaat vóór,
 *  dus die playlist is niet van deze mix. Zonder deze reden zou zo'n mix uit béide tabellen verdwijnen --
 *  uit de hoofdtabel omdat de getagde mix de rij houdt, uit deze omdat zijn status "own-playlist" is. */
function missingReasonOf(link: MixLink): MissingMix["reason"] | null {
  if (link.declaredIdConflict === "playlist-claimed-by-other-mix") return "claimed-by-other-mix";
  if (link.status === "bucket-only" || link.status === "unmatched") return link.status;
  return null;
}

/** Mix-info per Spotify-playlist-id, voor élke playlist die een mix exclusief weerspiegelt. De pure
 *  omzetting van een al berekend koppelresultaat -- geen fs, dus rechtstreeks toetsbaar.
 *
 *  Bewust alleen de twee 1-op-1-statussen uit de brug:
 *   - `own-playlist` -- de eigen genummerde MMC-playlist van deze mix;
 *   - `work-queue`   -- dezelfde mix, maar op Spotify nog in zijn `Vol. X`-werkbak.
 *
 *  `bucket-only` blijft er bewust buiten: dat is een grote kleur-emmer die de tracks van tíentallen
 *  mixen bevat, dus er is geen enkel mix-ID dat die rij eerlijk beschrijft -- daar hoort een lege cel.
 *  `unmatched` heeft per definitie geen playlist. Botsen twee mixen op dezelfde playlist, dan wint de
 *  harde sleutel (zie de toelichting in de lus); zonder sleutel houdt de eerste hem, en de brug toont die
 *  afwijking al (MixBridge.tsx). */
export function buildPlaylistMixIndex(links: readonly MixLink[]): PlaylistMixIndex {
  const byPlaylistId: Record<string, PlaylistMixInfo> = {};
  const missingMixes: MissingMix[] = [];
  let mixesWithId = 0;

  for (const link of links) {
    // Elke link staat voor één publieke mix uit de bron -- ook de mixen die géén eigen playlist hebben
    // (bucket-only/unmatched). Dit is dus de brontelling, los van de koppeling hieronder.
    if (link.mix.id) mixesWithId++;

    // Geen exclusieve playlist = geen rij in de tabel die dit ID kan tonen. Precies het verschil dat de
    // sync-check meldt, hier per mix zodat de tweede tabel kan laten zien wát er ontbreekt.
    const reason = missingReasonOf(link);
    const claimedByOther = reason === "claimed-by-other-mix";
    if (reason !== null) {
      const { mix } = link;
      missingMixes.push({
        mixId: mix.id,
        title: mix.title,
        color: mix.color,
        density: mix.density,
        gender: mix.gender,
        volume: mix.volume,
        genre: isGenreFamily(mix.genre) ? null : mix.genre,
        subgenre: mix.subgenre,
        bpm: mix.bpm,
        trackCount: mix.tracks.length,
        reason,
        bucketName: link.status === "bucket-only" ? (link.playlist?.name ?? null) : null,
        claimedBy:
          claimedByOther && link.playlist?.declaredMixId
            ? { mixId: link.playlist.declaredMixId, playlistName: link.playlist.name }
            : null,
      });
    }

    if (link.playlist === null) continue;
    if (link.status !== "own-playlist" && link.status !== "work-queue") continue;

    // BOTSING OP DEZELFDE PLAYLIST: de harde sleutel wint, ongeacht de volgorde in de bron.
    //
    // Dat is niet cosmetisch. Draagt playlist P de tag `mix:A`, dan koppelt mix A eraan op de tag,
    // terwijl mix B er via de tracklist óók op kan uitkomen (zie DeclaredIdConflict in matchMixes.ts).
    // Kwam B dan eerder in de mix-lijst voor, dan hield B deze rij -- en dus toonde de tabel B's ID met
    // `matchedBy: "tracklist"`, alsof de tag nog ontbrak. Het `#`-knopje ernaast bood vervolgens aan om
    // `mix:B` te schrijven, wat A's correcte tag zou overschrijven; de bulk-actie deed dat zelfs zonder
    // te vragen. Wie de tag zet, bepaalt dus welke mix bij deze playlist hoort -- de heuristiek mag daar
    // niet overheen.
    const bestaand = byPlaylistId[link.playlist.id];
    if (bestaand) {
      const winnaarIsSleutel = link.matchedBy === "declared-id" && bestaand.matchedBy !== "declared-id";
      if (!winnaarIsSleutel) continue;
    }

    const { genre, subgenre } = link.mix;
    // De inhoudelijke vergelijking: staat de spiegel er, en klopt hij nog? Losstaand van de vraag of de
    // koppeling hard is -- een beschrijving met het juiste ID kan een verouderd Vol.-nummer tonen.
    const beschrijving = compareDescription(link.playlist.description, link.mix);
    // Dezelfde vraag voor de naam, en bewust een aparte vergelijking: de naam wordt LETTERLIJK
    // overgenomen uit de bron, de beschrijving veld voor veld samengesteld. Zie spotifyTitle.ts.
    const naam = compareTitle(link.playlist.name, link.mix);
    byPlaylistId[link.playlist.id] = {
      mixId: link.mix.id,
      family: genreToFamily(genre) ?? genreToFamily(subgenre),
      // Een legacy-entry met `"genre": "EDM"` draagt daar een familie i.p.v. een genre (de veldspec
      // staat dat niet toe, maar de bestanden dragen het). Die waarde is hierboven al de familie
      // geworden; hem óók in de GENRE-kolom herhalen zou dezelfde informatie twee keer tonen.
      genre: isGenreFamily(genre) ? null : genre,
      subgenre,
      // `matchedBy` is bij een gekoppelde link nooit null (dat is alleen "unmatched"), maar de terugval
      // houdt het type eerlijk.
      matchedBy: link.matchedBy ?? "tracklist",
      descriptionState: beschrijving.state,
      descriptionDiffs: beschrijving.diffs,
      titleState: naam.state,
      titleTarget: naam.target,
      titleBlocker: naam.blocker,
    };
  }

  // Nieuwste mix bovenaan: het ID is `YYYYMMDD`, dus aflopend sorteren is chronologisch. Mixen zonder
  // ID zakken naar de bodem -- die kunnen sowieso nooit in de tabel opduiken.
  missingMixes.sort((a, b) => (Number(b.mixId) || 0) - (Number(a.mixId) || 0));

  return { byPlaylistId, missingMixes, mixesWithId: links.length === 0 ? null : mixesWithId };
}

/** Dezelfde opzoektabel, met de koppelingen van schijf gehaald. SERVER-ONLY (fs via getMixLinks()).
 *
 *  Ontbreekt de mix-map of de snapshot, dan is het resultaat gewoon leeg -- dezelfde "geen bron = leeg,
 *  niet stuk"-lijn als mixStore.ts/snapshotStore.ts. */
export function getPlaylistMixIndex(): PlaylistMixIndex {
  return buildPlaylistMixIndex(getMixLinks().links);
}
