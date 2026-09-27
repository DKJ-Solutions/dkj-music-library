// Fase 5: de flexibele filter/groepeer/zoek-interface voor /spotify. Client Component --
// ontvangt de verrijkte playlists (fase 4, server-side ingelezen door page.tsx) als props en
// doet alle filter/groepeer/zoek-interactie hier, client-side, over de al-geladen data. De pure
// filter-/groepeer-/stats-logica zelf staat los in playlistFilters.ts (getest, geen React/DOM).
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { readRouteErrorMessage } from "@/lib/http/routeError";
import type { EnrichedPlaylist } from "@/lib/spotify/enrichedPlaylists";
import { PLUTCHIK_COLORS } from "@/lib/spotify/plutchikColors";
import { SPOTIFY_WORLDS, WORLD_META, type SpotifyWorld } from "@/lib/spotify/classifyWorld";
import { MMC_BPM_TIERS as MMC_BPM_TIER_OPTIONS, classifyMmcBpm, type MmcBpmTier } from "@/lib/spotify/classifyBpm";
import {
  KNOWN_BPM_TIERS,
  createDefaultFilters,
  createEmptyFilters,
  filterPlaylists,
  flattenForList,
  isDefaultFilters,
  toggleSetFilter,
  withBpmOverride,
  withDoneStatus,
  withWorldOverride,
  type PlaylistFilters,
} from "@/lib/spotify/playlistFilters";
import { collectGenreLayerOptions, playlistFamily } from "@/lib/spotify/playlistGenreLayers";
import type { MissingMix, PlaylistMixInfo } from "@/lib/mixes/playlistMixInfo";
import { MissingMixes } from "./MissingMixes";
import { PlaylistNameBulkButton } from "./PlaylistNameBulkButton";
import { PlaylistNameSyncButton } from "./PlaylistNameSyncButton";
import {
  SORT_COLUMNS,
  columnCssName,
  nextSort,
  sortPlaylists,
  type PlaylistSort,
  type SortColumn,
} from "@/lib/spotify/playlistSort";

const DENSITY_OPTIONS: Array<"Full" | "Light"> = ["Full", "Light"];
const GENDER_OPTIONS: Array<"f" | "m"> = ["f", "m"];
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function PlaylistManager({
  playlists: initialPlaylists,
  artistCount = null,
  mixInfoById = {},
  mixesWithId = null,
  missingMixes = [],
  hiddenColumns = [],
}: {
  playlists: EnrichedPlaylist[];
  /** Aantal verschillende artiesten in de hele snapshot (countDistinctArtists, server-side berekend:
   *  EnrichedPlaylist draagt geen tracks). `null`/weggelaten = geen teller -- alleen meegeven op een
   *  weergave die álle playlists toont, net als `mixesWithId`. */
  artistCount?: number | null;
  /** Mix-info per playlist-id, server-side opgehaald uit de brug met de mix-JSON's
   *  (lib/mixes/playlistMixInfo.ts). Optioneel: zonder mix-map blijven ID/GENRE/SUBGENRE leeg. */
  mixInfoById?: Record<string, PlaylistMixInfo>;
  /** Aantal mixen met een `id` in de DJ Cylow-bron -- de noemer voor de sync-check naast de tellers.
   *  `null`/weggelaten = geen check tonen. Alleen meegeven op een weergave die álle kandidaten bevat
   *  (`/spotify` en de MMC-wereld): op een BPM-subset zou de vergelijking altijd een verschil laten
   *  zien, en dat verschil zegt dan niets. */
  mixesWithId?: number | null;
  /** De mixen uit de bron die in deze tabel ontbreken -- getoond als tweede tabel onderaan. Net als
   *  `mixesWithId` alleen meegeven waar de vergelijking opgaat; leeg/weggelaten = geen tweede tabel. */
  missingMixes?: readonly MissingMix[];
  /** Kolommen die op déze pagina niets toevoegen omdat ze er per definitie één waarde hebben -- op
   *  /spotify/musicmoodcolours is de wereld altijd MMC en het type altijd EDM, en een laag dieper (de
   *  BPM-sub-routes) is ook de BPM constant. Zie de toelichting bij `$playlist-cols` in
   *  _playlist-list.scss: de kolom krijgt breedte 0 en de cellen verdwijnen, maar ze blijven in de DOM
   *  staan zodat het grid niet verspringt. */
  hiddenColumns?: readonly SortColumn[];
}) {
  const [playlists, setPlaylists] = useState(initialPlaylists);
  // De openingsstand: met een mix-bron begint de tabel op `ID gevuld: Ja` (Dave: de playlists met een ID
  // zijn de belangrijke). Zonder bron heeft geen enkele rij een ID en zou die stand een lege tabel geven,
  // dus dan starten we leeg. Eén keer berekend -- de bron wisselt niet tijdens een sessie.
  const [defaultFilters] = useState<PlaylistFilters>(() =>
    Object.keys(mixInfoById).length > 0 ? createDefaultFilters() : createEmptyFilters()
  );
  const [filters, setFilters] = useState<PlaylistFilters>(defaultFilters);
  // null = geen sortering: dan geldt de standaardordening van flattenForList (ongesorteerd onderaan).
  const [sort, setSort] = useState<PlaylistSort | null>(null);
  const [doneErrorId, setDoneErrorId] = useState<string | null>(null);
  const [worldErrorId, setWorldErrorId] = useState<string | null>(null);
  const [bpmErrorId, setBpmErrorId] = useState<string | null>(null);
  const [tagErrorId, setTagErrorId] = useState<string | null>(null);
  // De uitleg die de route meestuurt -- die begint bij Spotify's eigen woorden. Los van `tagErrorId`
  // bijgehouden omdat een mislukking zónder leesbaar antwoord (netwerk weg) nog steeds een melding hoort
  // te geven, alleen dan zonder toelichting.
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagBusyId, setTagBusyId] = useState<string | null>(null);
  // Playlists waarvan de `mix:`-tag in deze sessie is geschreven -- de snapshot weet dat nog niet.
  const [tagOverrides, setTagOverrides] = useState<Record<string, "declared-id">>({});
  // Playlists die in deze sessie op Spotify zijn hernoemd: playlist-id -> de nieuwe naam. De snapshot
  // weet dat nog niet, dus de rij toont hem hieruit -- zelfde optimistische lijn als `tagOverrides`.
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; failed: number } | null>(
    null
  );
  // `reden` is de uitleg bij de eerste mislukking -- zonder die is "48 mislukt" een getal zonder houvast.
  const [bulkResult, setBulkResult] = useState<{
    gelukt: number;
    gefaald: number;
    reden: string | null;
  } | null>(null);

  // Een kolom staat in `hiddenColumns` omdat haar waarde op deze pagina constant is -- en dan voegt het
  // filter erop even weinig toe (Dave, 2026-07-25: "de BPM filters voegen ook niks meer toe op een bpm
  // pagina", idem voor Type). Dus geen tweede lijst om bij te houden: de filterbalk leest dezelfde prop.
  // Bij het BPM-filter is het zelfs misleidend om het te laten staan: dat filtert op de BPM úit de
  // playlistnaam (`parsed.bpm`), terwijl de route op de MMC-tier filtert -- en de MMC-namen dragen zelden
  // een BPM-annotatie, dus vrijwel elke rij zou eruit vallen.
  const verborgenKolommen = useMemo(() => new Set<SortColumn>(hiddenColumns), [hiddenColumns]);
  // Geen enkele playlist heeft mix-info (mix-bron niet gevonden, zie mixStore.ts): dan is elke ID-cel
  // leeg en valt er met het ID-filter niets te scheiden.
  const geenMixBron = Object.keys(mixInfoById).length === 0;
  // Hoeveel rijen een gevulde ID-cel hebben -- dezelfde maat als het "ID gevuld"-filter, en net als het
  // totaal geteld over álle geladen playlists in plaats van over de gefilterde lijst.
  const metMixId = useMemo(
    () => playlists.filter((p) => Boolean(mixInfoById[p.id]?.mixId)).length,
    [playlists, mixInfoById]
  );

  // De rijen waar de beschrijving nog niet de spiegel van de mix-JSON is: hij ontbreekt (`missing`) of hij
  // staat er maar wijkt per veld af (`outdated`, bv. omdat het Vol.-nummer in de JSON is bijgesteld nadat
  // de beschrijving is geschreven). Beide zijn met dezelfde schrijfactie op te lossen.
  //
  // Dit is de werkvoorraad voor de bulk-actie -- geteld over álle geladen playlists, niet over de
  // gefilterde lijst, zodat de knop niet stilletjes minder doet dan hij zegt.
  const tagsTeZetten = useMemo(
    () =>
      playlists
        .map((p) => ({ playlistId: p.id, mixInfo: mixInfoById[p.id] }))
        .filter(
          (r): r is { playlistId: string; mixInfo: PlaylistMixInfo } =>
            Boolean(r.mixInfo?.mixId) &&
            r.mixInfo!.descriptionState !== "in-sync" &&
            tagOverrides[r.playlistId] !== "declared-id"
        ),
    [playlists, mixInfoById, tagOverrides]
  );

  // Dezelfde werkvoorraad voor de NAMEN: rijen waarvan de playlistnaam afwijkt van `title_spotify` in de
  // mix-bron. Ook hier over álle geladen playlists geteld, en zonder de rijen die in deze sessie al
  // hernoemd zijn.
  //
  // Twee lijsten en niet één, want ze vragen iets anders van Dave: `namenTeZetten` is werk dat de knop kan
  // doen, `namenGeblokkeerd` is werk dat eerst in de BRON moet gebeuren (nu: de zes Cyan-playlists met 💠
  // in plaats van 🧊 -- zie lib/mixes/spotifyTitle.ts). Ze bij elkaar optellen zou een knop opleveren die
  // belooft wat hij niet kan.
  const namenTeZetten = useMemo(
    () =>
      playlists
        .map((p) => ({ playlistId: p.id, mixInfo: mixInfoById[p.id] }))
        .filter((r) => r.mixInfo?.titleState === "outdated" && nameOverrides[r.playlistId] === undefined)
        .map((r) => ({ playlistId: r.playlistId, target: r.mixInfo!.titleTarget! })),
    [playlists, mixInfoById, nameOverrides]
  );
  const namenGeblokkeerd = useMemo(
    () => playlists.filter((p) => mixInfoById[p.id]?.titleState === "blocked").length,
    [playlists, mixInfoById]
  );

  const handleNameWritten = useCallback((playlistId: string, name: string) => {
    setNameOverrides((prev) => ({ ...prev, [playlistId]: name }));
  }, []);

  // De keuzelijsten van de drie genre-filters: afgeleid uit de ONgefilterde lijst, zodat een keuze de
  // andere twee selects niet leegtrekt terwijl je nog aan het filteren bent.
  const genreOpties = useMemo(
    () => collectGenreLayerOptions(playlists, mixInfoById),
    [playlists, mixInfoById]
  );
  const filtered = useMemo(
    () => filterPlaylists(playlists, filters, mixInfoById),
    [playlists, filters, mixInfoById]
  );
  // De drie genre-selects, minus die waarvan de kolom op deze pagina verborgen is.
  const genreFilters = useMemo(
    () =>
      (
        [
          { key: "families", column: "type", label: "Type", opties: genreOpties.families, alle: "Alle types" },
          { key: "genres", column: "genre", label: "Genre", opties: genreOpties.genres, alle: "Alle genres" },
          {
            key: "subgenres",
            column: "subgenre",
            label: "Subgenre",
            opties: genreOpties.subgenres,
            alle: "Alle subgenres",
          },
        ] as const
      ).filter(({ column }) => !verborgenKolommen.has(column)),
    [genreOpties, verborgenKolommen]
  );
  // Sorteert de gefilterde lijst als één geheel: de gesorteerd/ongesorteerd-scheiding van
  // flattenForList zou de gekozen kolom anders binnen twee blokken sorteren, en dan staat een rij niet
  // waar je hem op grond van de kop verwacht.
  const rows = useMemo(
    () => (sort === null ? flattenForList(filtered) : sortPlaylists(filtered, sort, mixInfoById)),
    [filtered, sort, mixInfoById]
  );

  // Request-sequencing per playlist: bewaart per playlist-id het volgnummer van de laatst
  // gestarte toggle. Zonder dit zou de rollback van een trage, eerdere request een latere,
  // inmiddels geslaagde toggle op dezelfde playlist kunnen overschrijven (klik "aan", klik snel
  // daarna weer "uit", de trage eerste request faalt pas na de tweede geslaagde) -- "laatste
  // actie wint": een fout telt alleen nog mee als het nog steeds de meest recente actie is.
  const toggleSeqRef = useRef<Map<string, number>>(new Map());

  // Optimistic update: de UI reageert direct, de POST naar /api/spotify/done volgt async. Faalt
  // de schrijfactie, dan draait de toggle terug -- de UI mag nooit een status tonen die niet
  // daadwerkelijk is opgeslagen (zie doneStore.ts).
  async function handleToggleDone(playlistId: string, nextDone: boolean) {
    setDoneErrorId(null);
    setPlaylists((prev) => withDoneStatus(prev, playlistId, nextDone));

    const seq = (toggleSeqRef.current.get(playlistId) ?? 0) + 1;
    toggleSeqRef.current.set(playlistId, seq);

    try {
      const res = await fetch("/api/spotify/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, done: nextDone }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch {
      // Alleen terugdraaien als dit nog steeds de laatst gestarte toggle voor deze playlist is --
      // anders overschrijft deze verouderde rollback een intussen al geslaagde, latere toggle.
      if (toggleSeqRef.current.get(playlistId) === seq) {
        setPlaylists((prev) => withDoneStatus(prev, playlistId, !nextDone));
        setDoneErrorId(playlistId);
      }
    }
  }

  // Zelfde request-sequencing-recept als de done-toggle hierboven, nu voor de wereld-correctie:
  // een trage, verouderde rollback mag een intussen al geslaagde, latere correctie op dezelfde
  // playlist niet overschrijven.
  const worldSeqRef = useRef<Map<string, number>>(new Map());

  // DE ENIGE SCHRIJFACTIE NAAR SPOTIFY in deze interface (de rest van de correcties blijft lokaal): het
  // mix-ID als `mix:...` in de playlistbeschrijving zetten. `tagOverrides` houdt het resultaat lokaal bij
  // zodat de rij direct bijwerkt -- de snapshot verandert pas bij de volgende sync.
  const tagSeqRef = useRef<Map<string, number>>(new Map());

  async function handleWriteMixTag(playlistId: string, mixId: string) {
    setTagErrorId(null);
    setTagError(null);
    setTagBusyId(playlistId);
    setTagOverrides((prev) => ({ ...prev, [playlistId]: "declared-id" }));

    const seq = (tagSeqRef.current.get(playlistId) ?? 0) + 1;
    tagSeqRef.current.set(playlistId, seq);

    try {
      const res = await fetch("/api/spotify/mix-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, mixId }),
      });
      if (!res.ok) {
        // De uitleg meenemen in de fout: daar begint Spotify's eigen boodschap, en die is het enige wat
        // werkelijk vertelt wát er misging.
        throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
      }
    } catch (err) {
      // Zelfde "laatste actie wint"-regel als bij de andere correcties: een trage mislukking mag een
      // inmiddels geslaagde latere poging niet terugdraaien.
      if (tagSeqRef.current.get(playlistId) === seq) {
        setTagOverrides((prev) => {
          const next = { ...prev };
          delete next[playlistId];
          return next;
        });
        setTagErrorId(playlistId);
        setTagError(err instanceof Error ? err.message : null);
      }
    } finally {
      if (tagSeqRef.current.get(playlistId) === seq) setTagBusyId(null);
    }
  }

  /** Alle ontbrekende tags achter elkaar, met een voortgangsmelding.
   *
   *  Bewust SEQUENTIEEL en niet parallel: dit zijn tientallen schrijfacties naar dezelfde API. Parallel
   *  loopt tegen de rate limit aan, en dan moet elke aanroep zijn 429-wachttijd uitzitten -- langzamer
   *  dus, en minder netjes. Eén voor één is voorspelbaar en de voortgang blijft leesbaar.
   *
   *  Gaat door bij een fout in plaats van te stoppen: één playlist die Dave niet bezit hoort de andere
   *  46 niet te blokkeren. Aan het eind staat er hoeveel er gelukt zijn en hoeveel niet.
   *
   *  EN WAAROM ZE MISLUKTEN (Dave, 2026-07-25). Eerder stond er alleen een aantal: "0 bijgewerkt; 48
   *  mislukt". Bij 48 van de 48 is er één gemeenschappelijke oorzaak, en die stond letterlijk in elk
   *  antwoord -- maar werd weggegooid. De reden van de eerste mislukking wordt daarom bewaard en bij de
   *  uitslag getoond: dát is de informatie waarmee je verder komt, niet het getal. */
  async function handleWriteAllMixTags() {
    if (bulkBusy) return;
    setTagErrorId(null);
    setTagError(null);
    setBulkBusy(true);

    const teDoen = tagsTeZetten;
    let gelukt = 0;
    const gefaald: string[] = [];
    let eersteReden: string | null = null;

    for (const [index, rij] of teDoen.entries()) {
      setBulkProgress({ done: index, total: teDoen.length, failed: gefaald.length });
      try {
        const res = await fetch("/api/spotify/mix-tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: rij.playlistId, mixId: rij.mixInfo.mixId }),
        });
        if (!res.ok) {
          throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
        }
        gelukt++;
        setTagOverrides((prev) => ({ ...prev, [rij.playlistId]: "declared-id" }));
      } catch (err) {
        gefaald.push(rij.playlistId);
        // De eerste reden, niet de laatste: bij een gemeenschappelijke oorzaak zijn ze gelijk, en bij
        // losse weigeringen is de eerste de minst vertroebelde (geen rate-limit-ruis van de rest erna).
        if (eersteReden === null && err instanceof Error) eersteReden = err.message;
      }
    }

    setBulkProgress({ done: teDoen.length, total: teDoen.length, failed: gefaald.length });
    setBulkResult({ gelukt, gefaald: gefaald.length, reden: eersteReden });
    setBulkBusy(false);
  }

  async function postWorld(playlistId: string, world: SpotifyWorld | null) {
    const res = await fetch("/api/spotify/world", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, world }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  }

  // Optimistic update: de rij springt direct naar de gekozen wereld; faalt de schrijfactie, dan
  // draait de rij terug naar zijn vorige (effectieve) wereld -- net als de done-toggle.
  async function handleWorldChange(playlist: EnrichedPlaylist, nextWorld: SpotifyWorld) {
    setWorldErrorId(null);
    const { id: playlistId, world: prevWorld, worldIsOverridden: prevOverridden } = playlist;
    setPlaylists((prev) => withWorldOverride(prev, playlistId, nextWorld, true));

    const seq = (worldSeqRef.current.get(playlistId) ?? 0) + 1;
    worldSeqRef.current.set(playlistId, seq);

    try {
      await postWorld(playlistId, nextWorld);
    } catch {
      if (worldSeqRef.current.get(playlistId) === seq) {
        setPlaylists((prev) => withWorldOverride(prev, playlistId, prevWorld, prevOverridden));
        setWorldErrorId(playlistId);
      }
    }
  }

  // Wist de handmatige correctie weer -- de rij springt terug naar wat de auto-classificatie zou
  // raden (autoWorld, server-side berekend door classifyWorld.ts in enrichedPlaylists.ts).
  async function handleWorldReset(playlist: EnrichedPlaylist) {
    setWorldErrorId(null);
    const { id: playlistId, world: prevWorld } = playlist;
    const autoWorld = playlist.autoWorld;
    setPlaylists((prev) => withWorldOverride(prev, playlistId, autoWorld, false));

    const seq = (worldSeqRef.current.get(playlistId) ?? 0) + 1;
    worldSeqRef.current.set(playlistId, seq);

    try {
      await postWorld(playlistId, null);
    } catch {
      if (worldSeqRef.current.get(playlistId) === seq) {
        setPlaylists((prev) => withWorldOverride(prev, playlistId, prevWorld, true));
        setWorldErrorId(playlistId);
      }
    }
  }

  // Zelfde request-sequencing-recept als de wereld-correctie hierboven, nu voor de BPM-correctie
  // binnen MMC (bpmStore.ts/classifyBpm.ts) -- exact hetzelfde patroon, alleen het datamodel
  // verschilt (MmcBpmTier i.p.v. SpotifyWorld, en `null` i.p.v. de auto-classificatie in plaats van
  // een vaste "reset"-waarde die altijd bestaat).
  const bpmSeqRef = useRef<Map<string, number>>(new Map());

  async function postBpm(playlistId: string, bpm: MmcBpmTier | null) {
    const res = await fetch("/api/spotify/bpm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, bpm }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  }

  async function handleBpmChange(playlist: EnrichedPlaylist, nextBpm: MmcBpmTier) {
    setBpmErrorId(null);
    const { id: playlistId, mmcBpm: prevBpm, mmcBpmIsOverridden: prevOverridden } = playlist;
    setPlaylists((prev) => withBpmOverride(prev, playlistId, nextBpm, true));

    const seq = (bpmSeqRef.current.get(playlistId) ?? 0) + 1;
    bpmSeqRef.current.set(playlistId, seq);

    try {
      await postBpm(playlistId, nextBpm);
    } catch {
      if (bpmSeqRef.current.get(playlistId) === seq) {
        setPlaylists((prev) => withBpmOverride(prev, playlistId, prevBpm, prevOverridden));
        setBpmErrorId(playlistId);
      }
    }
  }

  // Wist de handmatige BPM-correctie weer -- de rij springt terug naar wat classifyMmcBpm() zou
  // afleiden (mogelijk null/"overig", anders dan de wereld-reset die altijd een geldige wereld
  // heeft dankzij de catch-all in classifyWorld.ts).
  async function handleBpmReset(playlist: EnrichedPlaylist) {
    setBpmErrorId(null);
    const { id: playlistId, mmcBpm: prevBpm } = playlist;
    const autoBpm = classifyMmcBpm(playlist);
    setPlaylists((prev) => withBpmOverride(prev, playlistId, autoBpm, false));

    const seq = (bpmSeqRef.current.get(playlistId) ?? 0) + 1;
    bpmSeqRef.current.set(playlistId, seq);

    try {
      await postBpm(playlistId, null);
    } catch {
      if (bpmSeqRef.current.get(playlistId) === seq) {
        setPlaylists((prev) => withBpmOverride(prev, playlistId, prevBpm, true));
        setBpmErrorId(playlistId);
      }
    }
  }

  return (
    <section className="layer">
      {/* Alleen het totaal. De tellers "afgerond" en "ongesorteerd" stonden hier ook, maar zijn
          2026-07-25 verdwenen (Dave: "voegt ook erg weinig toe") -- de done-vinkjes staan al in de
          tabel, en "ongesorteerd" was de restcategorie van een groepering die er niet meer is.
          Bewust het totaal van álle geladen playlists, niet het aantal na filteren: zo blijft dit een
          stabiel ijkpunt in plaats van een getal dat bij elke filterklik verspringt. */}
      <div className="stats">
        <div className="stat">
          <b>{playlists.length}</b>
          <span>playlists</span>
        </div>
        {artistCount !== null && (
          <div className="stat">
            <b>{artistCount.toLocaleString("nl-NL")}</b>
            <span>artiesten</span>
          </div>
        )}
        {/* Alleen als er een mix-bron is: zonder die bron is elke ID-cel leeg en zou hier "0 met ID"
            staan, wat een probleem suggereert dat er niet is. */}
        {!geenMixBron && (
          <div className="stat">
            <b>{metMixId}</b>
            <span>met ID</span>
          </div>
        )}
        {/* De sync-check tussen de twee bronnen: hoeveel mixen dragen een ID in de DJ Cylow-data, en
            weerspiegelt elk daarvan een playlist? Gelijk = ✓, verschil = ✗ met het aantal in de tooltip.
            Alleen zichtbaar waar de vergelijking opgaat -- zie de `mixesWithId`-prop. */}
        {mixesWithId !== null && (
          <div className="stat">
            <b>{mixesWithId}</b>
            <span>in DJ Cylow</span>
            <span
              className="stat-sync"
              data-in-sync={metMixId === mixesWithId}
              role="img"
              aria-label={
                metMixId === mixesWithId
                  ? `In sync: alle ${mixesWithId} mixen met een ID hebben een eigen playlist`
                  : `Verschil: ${mixesWithId - metMixId} van de ${mixesWithId} mixen met een ID hebben nog geen eigen playlist`
              }
              title={
                metMixId === mixesWithId
                  ? `In sync: alle ${mixesWithId} mixen met een ID hebben een eigen playlist`
                  : `${metMixId} playlists met een ID tegen ${mixesWithId} mixen in de DJ Cylow-data -- ${mixesWithId - metMixId} mixen hebben nog geen eigen playlist (zie de brug voor welke)`
              }
            >
              {metMixId === mixesWithId ? "✓" : "✗"}
            </span>
          </div>
        )}
      </div>

      {/* De bulk-actie: alle beschrijvingen in één keer gelijktrekken met de mix-JSON. Verschijnt alleen
          als er iets te doen is, en verdwijnt dus zodra alles klopt. Bewust hier bij de tellers en niet in
          de filterbalk: het is geen filter maar een eenmalige opruimactie, en de teller ernaast zegt hoe
          groot die is.

          Dit is de enige knop in de interface die MEERDERE wijzigingen in Dave's Spotify-account maakt --
          vandaar dat het aantal in het label staat en niet alleen "alles bijwerken". */}
      {tagsTeZetten.length > 0 && (
        <p className="playlist-bulk-tag">
          <button type="button" className="pill-toggle" disabled={bulkBusy} onClick={handleWriteAllMixTags}>
            {bulkBusy
              ? `Bezig… ${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? tagsTeZetten.length}`
              : `Werk ${tagsTeZetten.length} playlistbeschrijving${tagsTeZetten.length === 1 ? "" : "en"} bij op Spotify`}
          </button>
          <span className="playlist-bulk-hint">
            Schrijft <code>Subgenre · Color Power (Frequency) · Vol. N · ID</code> uit de mix-JSON in de
            beschrijving van elke playlist waar die nog ontbreekt of afwijkt. Eigen tekst blijft staan.
          </span>
        </p>
      )}
      {bulkResult && (
        <p
          className="playlist-bulk-result"
          style={{ color: bulkResult.gefaald > 0 ? "var(--status-critical)" : "var(--status-done)" }}
        >
          {bulkResult.gelukt} beschrijving{bulkResult.gelukt === 1 ? "" : "en"} op Spotify bijgewerkt
          {bulkResult.gefaald > 0
            ? `; ${bulkResult.gefaald} mislukt -- die staan nog met hun eigen knopje in de tabel.`
            : "."}
          {/* De oorzaak erbij, want een aantal zonder reden is geen melding maar een raadsel. */}
          {bulkResult.reden && (
            <>
              <br />
              <span className="playlist-bulk-reason">Reden van de eerste: {bulkResult.reden}</span>
            </>
          )}
        </p>
      )}

      {/* Dezelfde opruimactie voor de NAMEN, en bewust een eigen knop naast die voor de beschrijvingen:
          het zijn twee verschillende velden op Spotify met elk hun eigen schrijfroute, en ze staan niet
          per definitie in dezelfde stand -- op 2026-08-11 hadden alle 48 gekoppelde playlists een
          kloppende beschrijving en tóch nog hun oude naam. Eén knop maken zou verbergen wat er gebeurt. */}
      <PlaylistNameBulkButton
        teDoen={namenTeZetten}
        blockedCount={namenGeblokkeerd}
        onDone={handleNameWritten}
      />

      <div className="playlist-toolbar">
        <div className="playlist-toolbar-row">
          <div className="playlist-search">
            <SearchIcon />
            <input
              type="text"
              placeholder={`Zoek in ${playlists.length} playlists…`}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              aria-label="Zoek in playlistnamen"
            />
          </div>
          {!isDefaultFilters(filters, defaultFilters) && (
            <button
              type="button"
              className="pill-toggle playlist-clear-filters"
              onClick={() => setFilters(defaultFilters)}
            >
              Wis filters
            </button>
          )}
        </div>

        <div className="playlist-toolbar-row">
          <div className="playlist-filter-group">
            <span className="flabel">Kleur</span>
            {PLUTCHIK_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="color-toggle"
                data-color={color.toLowerCase()}
                data-active={filters.colors.has(color)}
                onClick={() => setFilters((f) => ({ ...f, colors: toggleSetFilter(f.colors, color) }))}
              >
                <span className="dot" style={{ background: `var(--emotion-${color.toLowerCase()})` }} aria-hidden="true" />
                {color}
              </button>
            ))}
          </div>
        </div>

        <div className="playlist-toolbar-row">
          <div className="playlist-filter-group">
            <span className="flabel">Dichtheid</span>
            {DENSITY_OPTIONS.map((density) => (
              <button
                key={density}
                type="button"
                className="pill-toggle"
                data-active={filters.densities.has(density)}
                onClick={() => setFilters((f) => ({ ...f, densities: toggleSetFilter(f.densities, density) }))}
              >
                {density}
              </button>
            ))}
          </div>
          <div className="playlist-filter-group">
            <span className="flabel">Geslacht</span>
            {GENDER_OPTIONS.map((gender) => (
              <button
                key={gender}
                type="button"
                className="pill-toggle"
                data-active={filters.genders.has(gender)}
                onClick={() => setFilters((f) => ({ ...f, genders: toggleSetFilter(f.genders, gender) }))}
              >
                ({gender})
              </button>
            ))}
          </div>
          {!verborgenKolommen.has("bpm") && (
            <div className="playlist-filter-group">
              <span className="flabel">BPM</span>
              {KNOWN_BPM_TIERS.map((bpm) => (
                <button
                  key={bpm}
                  type="button"
                  className="pill-toggle"
                  data-active={filters.bpms.has(bpm)}
                  onClick={() => setFilters((f) => ({ ...f, bpms: toggleSetFilter(f.bpms, bpm) }))}
                >
                  {bpm}
                </button>
              ))}
            </div>
          )}
          {/* Hier stond een STATUS-filter (open/afgerond). Dave 2026-07-25: "voegt weinig toe" -- het
              deed hetzelfde als sorteren op de ✓-kolom, die er sinds de sorteerbare koppen is. De
              done-toggle per rij blijft ongewijzigd; alleen het filteren erop is weg. */}
        </div>

        {/* Extra rij t.o.v. Gwen's illustratie: filteren op Dave's drie genre-lagen, dezelfde die de
            tabel als kolom toont. Selects i.p.v. chips omdat het er te veel zijn voor een chip-rij
            (tien subgenres alleen al).

            Hier stond eerst één "Familie"-filter op de naamgevingsfamilie uit de playlistnaam (Music
            Mood, D&D, OST, Top 100 ...). Dave heeft dat 2026-07-25 laten opsplitsen in TYPE/GENRE/
            SUBGENRE; de naamgevingsfamilie zelf bestaat nog wel (ze voedt de BPM- en
            wereld-classificatie) maar is niet langer filterbaar.

            De keuzelijsten komen uit de data, niet uit een vaste lijst: ROCK en POP zouden anders
            selecteerbaar zijn terwijl geen enkele mix ze heeft -- een keuze die nul rijen oplevert.

            Een select verdwijnt zodra zijn kolom verborgen is: op /spotify/musicmoodcolours (en dus ook
            op de BPM-routes daaronder) is elke rij EDM, en dan is een Type-select met één keuze niets
            meer dan ruis. Dezelfde `hiddenColumns`-prop bepaalt dat, zodat kolom en filter niet uit
            elkaar kunnen lopen. */}
        {(genreFilters.length > 0 || !verborgenKolommen.has("mixId")) && (
          <div className="playlist-toolbar-row">
            {genreFilters.map(({ key, label, opties, alle }) => (
              <label className="playlist-genrefilter" key={key}>
                <span className="flabel">{label}</span>
                <select
                  value={filters[key].size === 1 ? Array.from(filters[key])[0] : ""}
                  disabled={opties.length === 0}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [key]: e.target.value ? new Set([e.target.value]) : new Set() }))
                  }
                >
                  <option value="">{alle}</option>
                  {opties.map((optie) => (
                    <option key={optie} value={optie}>
                      {optie}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {/* Heeft deze rij een mix-ID? Praktisch de vraag "welke playlists weerspiegelen nog geen
                mix" -- op MMC 31 van de 79. Verdwijnt als de ID-kolom verborgen is, en staat uit als er
                helemaal geen mix-bron gevonden is (dan is alles "nee" en valt er niets te scheiden). */}
            {!verborgenKolommen.has("mixId") && (
              <div className="playlist-filter-group">
                <span className="flabel">ID gevuld</span>
                {(
                  [
                    { value: "yes", label: "Ja" },
                    { value: "no", label: "Nee" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className="pill-toggle"
                    disabled={geenMixBron}
                    data-active={filters.mixIds.has(value)}
                    onClick={() => setFilters((f) => ({ ...f, mixIds: toggleSetFilter(f.mixIds, value) }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {doneErrorId && (
        <p className="playlist-empty-note" style={{ color: "var(--status-critical)" }}>
          Kon de status voor playlist {doneErrorId} niet opslaan -- teruggedraaid. Probeer opnieuw.
        </p>
      )}
      {worldErrorId && (
        <p className="playlist-empty-note" style={{ color: "var(--status-critical)" }}>
          Kon de wereld voor playlist {worldErrorId} niet opslaan -- teruggedraaid. Probeer opnieuw.
        </p>
      )}
      {bpmErrorId && (
        <p className="playlist-empty-note" style={{ color: "var(--status-critical)" }}>
          Kon de BPM-tier voor playlist {bpmErrorId} niet opslaan -- teruggedraaid. Probeer opnieuw.
        </p>
      )}
      {tagErrorId && (
        <p className="playlist-empty-note" style={{ color: "var(--status-critical)" }}>
          Kon de beschrijving van playlist {tagErrorId} niet zetten — teruggedraaid.
          {/* De melding van de route erbij, en die begint bij Spotify's eigen woorden (zie
              spotifyErrorMessage in lib/spotify/errors.ts). Hier stond eerder één vaste verklaring over
              de schrijf-scope; die was bij 48 mislukte pogingen de verkeerde, terwijl het antwoord van de
              server de juiste al bevatte. Een vaste tekst kan niet weten wat er misging. */}
          {tagError && <> {tagError}</>}{" "}
          Blijft het misgaan, kijk dan op{" "}
          <a href="/spotify" className="accent-text">
            /spotify
          </a>{" "}
          of de verbinding nog staat.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="playlist-empty-note">Geen playlists gevonden voor deze filters/zoekterm.</p>
      ) : (
        // `data-hidden` draagt de kolommen die op deze pagina niets toevoegen, als spatie-lijst -- de
        // SCSS zet hun breedte op 0 en verbergt de cellen (zie $playlist-cols in _playlist-list.scss).
        <div className="playlist-table" data-hidden={hiddenColumns.map(columnCssName).join(" ")}>
          {/* Kolomvolgorde vastgelegd door Dave (2026-07-25): eerst wereld/type/bpm/naam/kleur, dan de
              detailkolommen. De koppen komen uit SORT_COLUMNS (playlistSort.ts) zodat de tabel en de
              sorteerlogica één bron delen; die orde moet gelijk lopen met de spans in PlaylistRow én
              met $playlist-cols in de SCSS -- het is één CSS-grid, dus een cel die op één plek
              verschuift zet de hele tabel scheef. Elke cel draagt daarom ook zijn `col-<naam>`-klasse:
              die geeft de vaste grid-kolom én is de greep waarmee een kolom verborgen wordt.

              Elke kop is een knop: klikken sorteert oplopend, nog eens aflopend, en een derde keer
              terug naar de standaardordening. Geen aria-sort hier -- dat attribuut hoort bij een
              role="columnheader" binnen een echte tabel-/grid-rol, en deze rij is een CSS-grid van
              divs. De sorteerstand zit daarom in het aria-label van de knop zelf. */}
          <div className="playlist-col-heads">
            {SORT_COLUMNS.map(({ column, label }) => {
              const actief = sort?.column === column;
              return (
                <button
                  key={column}
                  type="button"
                  className={`col-head-sort col-${columnCssName(column)}`}
                  data-active={actief}
                  aria-label={
                    actief
                      ? `${label} — nu gesorteerd ${sort.direction === "asc" ? "oplopend" : "aflopend"}; klik om ${sort.direction === "asc" ? "aflopend te sorteren" : "de sortering te wissen"}`
                      : `Sorteer op ${label}`
                  }
                  onClick={() => setSort((prev) => nextSort(prev, column))}
                >
                  <span className="col-head-label">{label}</span>
                  {actief && (
                    <span className="col-head-arrow" aria-hidden="true">
                      {sort.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {rows.map((playlist) => (
            <PlaylistRow
              key={playlist.id}
              playlist={playlist}
              mixInfo={mixInfoById[playlist.id] ?? null}
              tagWritten={tagOverrides[playlist.id] === "declared-id"}
              tagBusy={tagBusyId === playlist.id}
              writtenName={nameOverrides[playlist.id]}
              onWriteMixTag={handleWriteMixTag}
              onNameWritten={handleNameWritten}
              onToggleDone={handleToggleDone}
              onWorldChange={handleWorldChange}
              onWorldReset={handleWorldReset}
              onBpmChange={handleBpmChange}
              onBpmReset={handleBpmReset}
            />
          ))}
        </div>
      )}

      {/* De keerzijde van de tabel: de mix-ID's uit de DJ Cylow-bron die in geen enkele rij hierboven
          voorkomen. Rendert niets bij een lege lijst. */}
      <MissingMixes mixes={missingMixes} />
    </section>
  );
}

function PlaylistRow({
  playlist,
  mixInfo,
  tagWritten,
  tagBusy,
  writtenName,
  onWriteMixTag,
  onNameWritten,
  onToggleDone,
  onWorldChange,
  onWorldReset,
  onBpmChange,
  onBpmReset,
}: {
  playlist: EnrichedPlaylist;
  /** De mix die deze playlist weerspiegelt, of null als er geen 1-op-1-koppeling is. */
  mixInfo: PlaylistMixInfo | null;
  /** De `mix:`-tag is in deze sessie geschreven -- de snapshot weet dat nog niet. */
  tagWritten?: boolean;
  /** De schrijfactie voor deze rij loopt nog. */
  tagBusy?: boolean;
  /** De naam die deze playlist in deze sessie op Spotify heeft gekregen -- de snapshot weet dat nog niet,
   *  dus die naam wint in de weergave. Undefined = niet hernoemd. */
  writtenName?: string;
  /** Weggelaten = geen schrijfknop (bv. in een weergave die niet mag schrijven). */
  onWriteMixTag?: (playlistId: string, mixId: string) => void;
  /** Meldt een geslaagde hernoeming, zodat de tabel de nieuwe naam kan tonen. Weggelaten = geen
   *  hernoem-knop in de naam-cel. */
  onNameWritten?: (playlistId: string, name: string) => void;
  onToggleDone: (playlistId: string, done: boolean) => void;
  onWorldChange: (playlist: EnrichedPlaylist, world: SpotifyWorld) => void;
  onWorldReset: (playlist: EnrichedPlaylist) => void;
  onBpmChange: (playlist: EnrichedPlaylist, bpm: MmcBpmTier) => void;
  onBpmReset: (playlist: EnrichedPlaylist) => void;
}) {
  const { parsed } = playlist;
  // Zelfde bron als de sorteersleutel en het filter (playlistGenreLayers.ts): uit de gekoppelde mix,
  // met de naamgevingsfamilie uit de playlistnaam als terugval.
  const family = playlistFamily(playlist, mixInfo);
  // Drie standen, want "er staat iets" en "het klopt" zijn niet hetzelfde:
  //   in-sync   -> de beschrijving is de spiegel van de JSON; niets te doen.
  //   outdated  -> de spiegel staat er, maar een veld wijkt af (bv. Vol. bijgesteld in de JSON).
  //   missing   -> nog nooit geschreven.
  // Een schrijfactie in deze sessie zet de stand direct op in-sync: de snapshot weet het nog niet.
  const beschrijving: "in-sync" | "outdated" | "missing" =
    tagWritten === true ? "in-sync" : (mixInfo?.descriptionState ?? "missing");
  const klopt = beschrijving === "in-sync";
  return (
    <div className="playlist-row">
      {/* Kolomvolgorde (Dave, 2026-07-25): WERELD, TYPE, BPM, NAAM, KLEUR eerst -- de assen waarop hij
          de lijst scant -- daarna de detailkolommen. Wereld-correctie: een select (effectieve wereld) +
          een klein reset-knopje dat alleen verschijnt zodra er een handmatige override is. */}
      <span className="world-cell col-world">
        <select
          className="world-select"
          data-overridden={playlist.worldIsOverridden}
          value={playlist.world}
          aria-label={`Wereld van ${playlist.name}${playlist.worldIsOverridden ? " (handmatig ingesteld)" : " (geraden)"}`}
          onChange={(e) => onWorldChange(playlist, e.target.value as SpotifyWorld)}
        >
          {SPOTIFY_WORLDS.map((world) => (
            <option key={world} value={world}>
              {WORLD_META[world].label}
            </option>
          ))}
        </select>
        {playlist.worldIsOverridden && (
          <button
            type="button"
            className="world-reset"
            title="Handmatig ingesteld -- klik om terug te zetten naar geraden"
            aria-label={`Wereld-correctie van ${playlist.name} terugzetten naar geraden`}
            onClick={() => onWorldReset(playlist)}
          >
            ↺
          </button>
        )}
      </span>
      <span className="type col-type" data-empty={family === null}>
        {family ?? "—"}
      </span>
      {/* Eén BPM-kolom. Binnen MMC is dat de corrigeerbare tier-select (classifyBpm.ts/bpmStore.ts);
          daarbuiten is er niets te corrigeren en blijft het de uit de naam geparsede BPM als tekst.
          Eerder stonden dit twee losse kolommen ("BPM" met parsed.bpm + "MMC-BPM" met de select) --
          verwarrend naast elkaar, want op de MMC-mixen draagt de naam meestal géén BPM en bleef de
          eerste kolom leeg terwijl de tweede de echte waarde had. */}
      <span className="bpm col-bpm">
        {playlist.world === "mmc" ? (
          <>
            <select
              className="bpm-tier-select"
              data-overridden={playlist.mmcBpmIsOverridden}
              value={playlist.mmcBpm !== null ? String(playlist.mmcBpm) : ""}
              aria-label={`BPM van ${playlist.name}${playlist.mmcBpmIsOverridden ? " (handmatig ingesteld)" : " (geraden)"}`}
              onChange={(e) => onBpmChange(playlist, Number(e.target.value) as MmcBpmTier)}
            >
              {/* "Overig" is bewust geen echte selecteerbare keuzeoptie (er is geen bpm-waarde voor "geen
                  van de vier") -- alleen zichtbaar als de huidige effectieve BPM null is, zodat de
                  select niet stilzwijgend op de eerste tier (96) lijkt te staan. */}
              {playlist.mmcBpm === null && (
                <option value="" disabled>
                  Overig
                </option>
              )}
              {MMC_BPM_TIER_OPTIONS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
            {playlist.mmcBpmIsOverridden && (
              <button
                type="button"
                className="bpm-tier-reset"
                title="Handmatig ingesteld -- klik om terug te zetten naar geraden"
                aria-label={`BPM-correctie van ${playlist.name} terugzetten naar geraden`}
                onClick={() => onBpmReset(playlist)}
              >
                ↺
              </button>
            )}
          </>
        ) : (
          (parsed.bpm ?? "—")
        )}
      </span>
      {/* De naam, met het hernoem-knopje ernaast zodra hij afwijkt van `title_spotify` in de mix-bron.
          Is de rij in deze sessie hernoemd, dan toont hij de NIEUWE naam: dat is wat er op Spotify staat,
          en de snapshot loopt tot de volgende sync achter. De tooltip houdt de oude naam erbij, zodat de
          wijziging navolgbaar blijft. */}
      <span
        className="name col-name"
        title={writtenName ? `${writtenName}\n(was: ${playlist.name})` : playlist.name}
      >
        {writtenName ?? playlist.name}
        {mixInfo && onNameWritten && writtenName === undefined && (
          <PlaylistNameSyncButton
            playlistId={playlist.id}
            playlistName={playlist.name}
            state={mixInfo.titleState}
            target={mixInfo.titleTarget}
            blocker={mixInfo.titleBlocker}
            onDone={onNameWritten}
          />
        )}
      </span>
      {/* De kleur-kolom: alleen de cirkel, met de kleurnaam als tooltip -- de naam uitschrijven zou
          een kolom van 60+px kosten voor informatie die de kleur zelf al geeft. */}
      <span
        className={parsed.color ? "swatch col-color" : "swatch swatch--neutral col-color"}
        style={parsed.color ? { background: `var(--emotion-${parsed.color.toLowerCase()})` } : undefined}
        role="img"
        title={parsed.color ?? "Geen kleur herkend"}
        aria-label={parsed.color ? `Kleur: ${parsed.color}` : "Geen kleur herkend"}
      />
      {/* Het mix-ID uit de JSON's (YYYYMMDD). Leeg zodra deze playlist geen mix exclusief
          weerspiegelt -- een kleur-emmer draagt de tracks van tientallen mixen en hoort dus geen
          enkel ID te tonen (zie playlistMixInfo.ts). */}
      {/* `data-state` onderscheidt de drie standen van de beschrijving: klopt met de JSON, wijkt af, of
          ontbreekt. Praktisch het werklijstje: alles zonder merkteken vraagt een schrijfactie -- en die
          doe je met het knopje ernaast. */}
      <span
        className="mix-id col-mix-id"
        data-key={klopt ? "declared" : ""}
        data-state={mixInfo ? beschrijving : ""}
        title={
          mixInfo
            ? beschrijving === "in-sync"
              ? `Mix ${mixInfo.mixId} -- de playlistbeschrijving is de spiegel van de mix-JSON`
              : beschrijving === "outdated"
                ? `Mix ${mixInfo.mixId} -- de beschrijving wijkt af van de JSON: ${mixInfo.descriptionDiffs
                    .map((d) => `${d.field} is "${d.inDescription ?? "leeg"}", moet "${d.inMix ?? "leeg"}"`)
                    .join("; ")}`
                : `Mix ${mixInfo.mixId} -- gevonden via de tracklist; de beschrijving noemt de mix-velden nog niet`
            : undefined
        }
      >
        {mixInfo?.mixId || ""}
        {/* Alleen waar er iets te schrijven valt: de beschrijving ontbreekt of wijkt af. Dit is de enige
            knop in de hele interface die iets in Dave's Spotify-account wijzigt -- vandaar de expliciete
            tekst in de tooltip over wát er gebeurt. Het merkteken zegt ook wélk van de twee het is: `#`
            voor een ontbrekende beschrijving, `≠` voor een die achterloopt. */}
        {mixInfo && !klopt && onWriteMixTag && (
          <button
            type="button"
            className="mix-id-write"
            data-state={beschrijving}
            disabled={tagBusy}
            title={
              beschrijving === "outdated"
                ? `Werk de beschrijving van deze playlist bij naar de huidige JSON-waarden (eigen tekst blijft staan)`
                : `Zet de mix-velden in de beschrijving van deze playlist op Spotify (bestaande tekst blijft staan)`
            }
            aria-label={
              beschrijving === "outdated"
                ? `Werk de Spotify-beschrijving van ${playlist.name} bij naar mix ${mixInfo.mixId}`
                : `Zet de velden van mix ${mixInfo.mixId} in de Spotify-beschrijving van ${playlist.name}`
            }
            onClick={() => onWriteMixTag(playlist.id, mixInfo.mixId)}
          >
            {tagBusy ? "…" : beschrijving === "outdated" ? "≠" : "#"}
          </button>
        )}
      </span>
      <span className="genre col-genre" title={mixInfo?.genre ?? undefined}>
        {mixInfo?.genre ?? "—"}
      </span>
      <span className="subgenre col-subgenre" title={mixInfo?.subgenre ?? undefined}>
        {mixInfo?.subgenre ?? "—"}
      </span>
      <span className="density col-density" data-density={parsed.density ?? ""}>
        {parsed.density ?? "—"}
      </span>
      <span className="gender col-gender">{parsed.gender ?? "—"}</span>
      <span className="vol col-volume">{parsed.volume ?? "—"}</span>
      <span className="tracks col-tracks">{playlist.trackCount}</span>
      <button
        type="button"
        className="done col-done"
        data-done={playlist.done}
        aria-pressed={playlist.done}
        aria-label={
          playlist.done ? `${playlist.name}: afgerond -- klik om te wissen` : `${playlist.name}: markeer als afgerond`
        }
        onClick={() => onToggleDone(playlist.id, !playlist.done)}
      >
        {playlist.done ? "✓" : "—"}
      </button>
    </div>
  );
}
