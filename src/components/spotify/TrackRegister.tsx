"use client";
// De tabel van /spotify/trackregister: zoeken, filteren op een bereik van year, op dkj_bpm, dkj_genre, dkj_album en dkj_group, sorteren via de kopregel, en bladeren per
// 100 rijen (12.000+ rijen in één keer renderen maakt de pagina traag). Alle logica die geen React is
// zit in register.ts; hier alleen de weergave en de filterstand.
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { DKJ_ALBUM_COLOURS, DKJ_ALBUM_OPTIONS, DKJ_BPM_OPTIONS, DKJ_GENRE_OPTIONS, DKJ_RATING_OPTIONS, MIX_RATING_KEY, RATING_KEY, TRACK_FIELDS, type RatingKey } from "@/lib/library/fields";
import { mixUrl } from "@/lib/library/djcylowMix";
import { playlistUrl } from "@/lib/library/playlistLink";
import { moveItem, planPlaylistMove } from "@/lib/library/playlistOrder";
import { PlaylistOrderError, savePlaylistOrder } from "@/lib/library/savePlaylistOrder";
import { saveRating } from "@/lib/library/saveRating";
import { loadSpotifyIframeApi, trackEmbedUrl, trackUri, type SpotifyEmbedController } from "@/lib/library/trackEmbed";
import {
  CANDIDATES_FILTER,
  EMPTY_FILTER,
  SORT_KEYS,
  countBy,
  filterRegister,
  fold,
  searchText,
  sortRegister,
  type RegisterRow,
  type RegisterSort,
  type SortKey,
} from "@/lib/library/register";
import {
  defaultRegisterPrefs,
  isDefaultRegisterPrefs,
  loadRegisterPrefs,
  saveRegisterPrefs,
  type ColumnSet,
  type RegisterPrefs,
  type RegisterPrefsOptions,
} from "@/lib/library/registerPrefs";

const PAGE_SIZE = 100;
const ALBUM_VARIANTS = ["Light (f)", "Full (f)", "Light (m)", "Full (m)"] as const;
const nf = new Intl.NumberFormat("nl-NL");
const GROUP_OPTIONS: readonly string[] = TRACK_FIELDS.find((field) => field.key === "dkj_group")?.options ?? [];

/** De opties waartegen een opgeslagen filterstand gevalideerd wordt (registerPrefs.ts). */
const PREFS_OPTIONS: RegisterPrefsOptions = {
  bpm: DKJ_BPM_OPTIONS,
  genre: DKJ_GENRE_OPTIONS,
  album: [...DKJ_ALBUM_COLOURS, ...DKJ_ALBUM_OPTIONS, CANDIDATES_FILTER],
  group: GROUP_OPTIONS,
  sortKeys: SORT_KEYS,
};

/** De stand waarmee het register opent zonder (geldige) opgeslagen filters -- ook de stand van
 *  "Filters wissen". */
const DEFAULT_PREFS: RegisterPrefs = defaultRegisterPrefs();

/** Eén kolom van de tabel: het veld, waarop hij sorteert, zijn deel van de breedte (table-layout: fixed,
 *  zodat alle kolommen altijd passen) en wat er in de cel staat. De afspeelkolom ("play") is geen veld en
 *  sorteert niet; zijn kop heeft alleen een naam voor een schermlezer. De plek-kolom ("position") is ook
 *  geen veld: hij nummert de rijen 1 tot en met n in de volgorde waarin ze nu staan. */
interface Column {
  key: SortKey | "play" | "position" | "grip";
  field: string;
  /** Kortere kop in de tabel dan de veldnaam, zodat de kolom smal kan blijven; de tooltip noemt het veld. */
  label?: string;
  width: string;
  /** `position` is de plek van de rij in de tabel, vanaf 1. */
  cell: (row: RegisterRow, term: string, edit: CellEdit, position: number) => ReactNode;
  className?: string;
}

/** Wat een bewerkbare cel nodig heeft: een waardering van een rij in de tabel zetten (Rating), en de
 *  track die in de speler staat kiezen (PlayButton). */
interface CellEdit {
  setRating: (trackId: string, field: RatingKey, rating: string | null) => void;
  playingId: string | null;
  togglePlay: (row: RegisterRow) => void;
  /** Het verslepen van rijen (DragHandle); null als de tabel geen playlist-volgorde heeft. */
  drag: DragEdit | null;
}

/** Wat de sleepgreep van een rij nodig heeft. `enabled` is false zolang er op een kop gesorteerd is (dan is
 *  de tabel niet meer in de volgorde van de playlist) of er al een verplaatsing loopt. */
interface DragEdit {
  enabled: boolean;
  disabledReason: string;
  start: (index: number, event: DragEvent<HTMLElement>) => void;
  end: () => void;
  move: (from: number, to: number) => void;
}

/** De volgorde van een playlist zoals de pagina hem kent (page.tsx): de plekken waarop een sleepactie bij
 *  Spotify landt, en het snapshot_id waartegen dat gebeurt. */
export interface PlaylistOrderProps {
  playlistId: string;
  snapshotId: string;
  /** Per rij-id de plek in de playlist (index in `playlist.tracks`); zie orderRowsByPlaylist. */
  positions: Record<string, number>;
  /** De Spotify-track-ID per plek van de playlist (null bij een item zonder track): de sleepactie stuurt de
   *  verwachte ID's op beide plekken mee, zodat de server tegen de live playlist kan controleren. */
  itemIds: (string | null)[];
}

/** Klik op een kop: oplopend, nog eens: aflopend, een derde keer: weer de oorspronkelijke volgorde. */
function nextSort(current: RegisterSort | null, key: SortKey): RegisterSort | null {
  if (current?.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

interface TrackRegisterProps {
  rows: RegisterRow[];
  artistCount: number;
  /** Alleen de cijfers en de tabel, met alle rijen op één pagina en de kolommen van COMPACT_COLUMNS: geen
   *  zoekbalk, kolomschakelaar, filters of pager (Dave, 28 oktober 2026), voor een pagina met een deel van het register, zoals een werkbak op
   *  /mixen/preparation/<id>. Dan wordt ook geen filterstand onthouden: een opgeslagen filter van
   *  /spotify/trackregister zou hier anders onzichtbaar tracks verbergen. Sorteren via de koppen blijft.
   *
   *  Met `playlistOrder` staan de rijen in de volgorde waarin ze binnenkomen (die van Spotify) tot je op een
   *  kop klikt; een derde klik geeft die volgorde terug. Zonder (een mixpagina) opent de tabel op de hoogste
   *  dkj_mix_rating. */
  compact?: boolean;
  /** Alleen met `compact`, voor de pagina van één playlist: de rijen zijn te verslepen en een sleepactie
   *  verplaatst de track ook in de playlist op Spotify (Dave, 31 oktober 2026). */
  playlistOrder?: PlaylistOrderProps;
}

/** Tekst met de zoekterm gemarkeerd (accent-ongevoelig, eerste treffer). */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? fold(text).indexOf(term) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + term.length)}</mark>
      {text.slice(at + term.length)}
    </>
  );
}

const Empty = () => <span className="register-none">—</span>;

function AlbumTag({ album, term }: { album: string; term: string }) {
  const colour = DKJ_ALBUM_COLOURS.find((c) => album.startsWith(`${c} `));
  return (
    <span className="register-tag">
      {colour && (
        <span
          className={album.includes("Light") ? "register-swatch register-swatch--light" : "register-swatch"}
          style={{ ["--c" as string]: `var(--emotion-${colour.toLowerCase()})` }}
          aria-hidden="true"
        />
      )}
      <Highlight text={album} term={term} />
    </span>
  );
}

/** Een link naar buiten: een playlist op Spotify of een mix op djcylow.com. */
interface OutLink {
  key: string;
  name: string;
  href: string;
}

function OutLinkLabel({ link, site, term, className }: { link: OutLink; site: string; term: string; className: string }) {
  return (
    <a className={className} href={link.href} target="_blank" rel="noopener noreferrer" title={`Open "${link.name}" op ${site}`}>
      <Highlight text={link.name} term={term} />
    </a>
  );
}

// Maten van het menu, gelijk aan .register-menu-list in _track-register.scss.
const MENU_MAX_HEIGHT = 260;
const MENU_MAX_WIDTH = 360;
const MENU_GAP = 4;
const MENU_MARGIN = 8;

type MenuPlace = { left: number; top?: number; bottom?: number; maxHeight: number };

/** Waar het menu komt: onder de knop, of erboven als daar meer ruimte is en eronder niet genoeg. */
function placeMenu(toggle: HTMLElement): MenuPlace {
  const rect = toggle.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - MENU_GAP - MENU_MARGIN;
  const above = rect.top - MENU_GAP - MENU_MARGIN;
  const left = Math.max(MENU_MARGIN, Math.min(rect.left, window.innerWidth - MENU_MAX_WIDTH - MENU_MARGIN));
  return below >= MENU_MAX_HEIGHT || below >= above
    ? { left, top: rect.bottom + MENU_GAP, maxHeight: Math.min(MENU_MAX_HEIGHT, below) }
    : { left, bottom: window.innerHeight - rect.top + MENU_GAP, maxHeight: Math.min(MENU_MAX_HEIGHT, above) };
}

/** Een knop die een menu opent, voor een cel die anders op twee regels zou komen. Het menu ligt ALTIJD
 *  OVER DE TABEL HEEN (Dave): het staat in een portal op <body> met position: fixed, zodat het scrollvak
 *  van de tabel (overflow: auto) het niet meer afkapt. Het sluit bij een klik ernaast, met Escape, en bij
 *  scrollen of een ander venstermaat, want dan klopt de plek naast de knop niet meer. `children` mag een
 *  functie zijn die het menu kan sluiten, voor een menu waarin je iets kiest (Rating). */
function Dropdown({
  label,
  children,
  toggleClassName = "register-menu-toggle",
  ariaLabel,
  title,
  caret = true,
}: {
  label: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  toggleClassName?: string;
  ariaLabel?: string;
  title?: string;
  caret?: boolean;
}) {
  const [place, setPlace] = useState<MenuPlace | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const open = place !== null;

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (toggle.current?.contains(target) || list.current?.contains(target));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlace(null);
    };
    const onPointer = (event: MouseEvent) => {
      if (!inside(event.target)) setPlace(null);
    };
    // Scrollen in het menu zelf laat het open; scrollen van de tabel of de pagina sluit het.
    const onScroll = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) setPlace(null);
    };
    const onResize = () => setPlace(null);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div className="register-menu">
      <button
        ref={toggle}
        type="button"
        className={toggleClassName}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        title={title}
        onClick={() => setPlace(open || !toggle.current ? null : placeMenu(toggle.current))}
      >
        {label}
        {caret && <span aria-hidden="true"> ▾</span>}
      </button>
      {place &&
        createPortal(
          <div
            ref={list}
            className="register-menu-list"
            style={{ left: place.left, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
          >
            {typeof children === "function" ? children(() => setPlace(null)) : children}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Het symbool per paar tiers (Dave): tier-1/2 een groene cirkel, tier-3/4 een blauwe driehoek,
// tier-5/6 een paarse ruit, tier-7/8 een oranje vijfhoek. De vorm staat in _track-register.scss.
const RATING_SYMBOLS = [
  { shape: "circle", colour: "green" },
  { shape: "triangle", colour: "blue" },
  { shape: "diamond", colour: "magenta" },
  { shape: "pentagon", colour: "orange" },
] as const;

function RatingSymbol({ rating }: { rating: string }) {
  const level = Number(rating.replace(/^tier-/, ""));
  const symbol = RATING_SYMBOLS[Math.ceil(level / 2) - 1];
  if (!symbol) return null;
  return (
    <span
      className={`register-rating-symbol register-rating-symbol--${symbol.shape}`}
      style={{ ["--c" as string]: `var(--rating-${symbol.colour})` }}
      aria-hidden="true"
    />
  );
}

/** De waardering met een potloodje erachter (Dave): klik erop en de acht tiers verschijnen; een klik op
 *  een tier maakt hem de nieuwe waarde en slaat hem meteen op (saveRating, POST /api/spotify/rating).
 *  Optimistisch: de tabel toont de keuze direct, zodat sorteren en zoeken er meteen mee werken. Mislukt
 *  het opslaan, dan komt de vorige waarde terug en staat de reden in de tooltip -- een waardering die
 *  alleen in de browser staat, zou bij de volgende paginalading stilletjes verdwijnen. */
/** Welke eigenschap van een rij bij welk waarderingsveld hoort. */
const RATING_ROW_KEY = { [RATING_KEY]: "rating", [MIX_RATING_KEY]: "mixRating" } as const satisfies Record<RatingKey, keyof RegisterRow>;

/** Zelfde cel voor dkj_rating en dkj_mix_rating (Dave, 31 oktober 2026): `field` zegt welke. */
function Rating({ row, term, field, setRating }: { row: RegisterRow; term: string; field: RatingKey; setRating: CellEdit["setRating"] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = row[RATING_ROW_KEY[field]];

  async function choose(next: string) {
    if (next === value) return;
    const previous = value;
    setRating(row.id, field, next);
    setBusy(true);
    setError(null);
    try {
      await saveRating(row.id, next, field);
    } catch (err) {
      setRating(row.id, field, previous);
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`register-rating${error ? " is-error" : ""}${busy ? " is-busy" : ""}`} title={error ? `Opslaan mislukt: ${error}` : undefined}>
      {value ? (
        <span className="register-tag">
          <RatingSymbol rating={value} />
          <Highlight text={value} term={term} />
        </span>
      ) : (
        <Empty />
      )}
      <Dropdown
        label="✎"
        caret={false}
        toggleClassName="register-rating-edit"
        ariaLabel={`${field} van ${row.id} wijzigen`}
        title={field === MIX_RATING_KEY ? "Mixwaardering wijzigen" : "Waardering wijzigen"}
      >
        {(close) =>
          DKJ_RATING_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="register-menu-item register-menu-choice"
              aria-current={option === value ? "true" : undefined}
              onClick={() => {
                close();
                void choose(option);
              }}
            >
              <RatingSymbol rating={option} />
              {option}
            </button>
          ))
        }
      </Dropdown>
    </span>
  );
}

/** Eén link: een label dat hem opent. Meer dan één: een menu "N <noun>" van links (playlists, mixen). */
function OutLinkLabels({ links, site, noun, term }: { links: OutLink[]; site: string; noun: string; term: string }) {
  if (links.length === 0) return <Empty />;
  if (links.length === 1) return <OutLinkLabel link={links[0]} site={site} term={term} className="register-playlist" />;
  // Zoekt iemand op een naam, dan staat die treffer op de knop, zodat je ziet waarom de rij er staat.
  const hit = term ? links.find((link) => fold(link.name).includes(term)) : undefined;
  return (
    <Dropdown
      label={
        hit ? (
          <>
            <Highlight text={hit.name} term={term} />
            <span className="register-menu-count">+{links.length - 1}</span>
          </>
        ) : (
          `${links.length} ${noun}`
        )
      }
    >
      {links.map((link) => (
        <OutLinkLabel key={link.key} link={link} site={site} term={term} className="register-menu-item" />
      ))}
    </Dropdown>
  );
}

/** Eén groep: een label. Meer groepen: een menu "N groups", net als bij playlists en artiesten. */
function Groups({ groups, term }: { groups: string[]; term: string }) {
  if (groups.length === 0) return <Empty />;
  if (groups.length === 1) {
    return (
      <span className="register-tag">
        <Highlight text={groups[0]} term={term} />
      </span>
    );
  }
  const hit = term ? groups.find((group) => fold(group).includes(term)) : undefined;
  return (
    <Dropdown
      label={
        hit ? (
          <>
            <Highlight text={hit} term={term} />
            <span className="register-menu-count">+{groups.length - 1}</span>
          </>
        ) : (
          `${groups.length} groups`
        )
      }
    >
      {groups.map((group) => (
        <span key={group} className="register-menu-item register-menu-item--static">
          <Highlight text={group} term={term} />
        </span>
      ))}
    </Dropdown>
  );
}

/** Het eigen album als label. Is het leeg omdat de playlists verschillende albums noemen, dan een menu
 *  "N albums" met die kandidaten, net als bij playlists en groepen (Dave). */
function Album({ album, candidates, term }: { album: string | null; candidates: string[]; term: string }) {
  if (album) return <AlbumTag album={album} term={term} />;
  if (candidates.length < 2) return <Empty />;
  const hit = term ? candidates.find((candidate) => fold(candidate).includes(term)) : undefined;
  return (
    <Dropdown
      label={
        hit ? (
          <>
            <Highlight text={hit} term={term} />
            <span className="register-menu-count">+{candidates.length - 1}</span>
          </>
        ) : (
          `${candidates.length} albums`
        )
      }
    >
      {candidates.map((candidate) => (
        <span key={candidate} className="register-menu-item register-menu-item--static">
          <AlbumTag album={candidate} term={term} />
        </span>
      ))}
    </Dropdown>
  );
}

/** Tekst die op één regel afgekapt wordt, met de volledige tekst als tooltip. */
function OneLine({ text, term, className }: { text: string | null; term: string; className: string }) {
  if (!text) return <Empty />;
  return (
    <span className={`register-oneline ${className}`} title={text}>
      <Highlight text={text} term={term} />
    </span>
  );
}

/** De afspeelknop in de eigen kolom vóór de titel: zet de track in de speler onderin de tabel, of haalt
 *  hem er weer uit. Zonder spotify_track_id valt er niets af te spelen, dan blijft de cel leeg. */
function PlayButton({ row, edit }: { row: RegisterRow; edit: CellEdit }) {
  if (!row.spotifyTrackId) return null;
  const playing = edit.playingId === row.id;
  const name = row.dkjTitle || row.title || row.id;
  return (
    <button
      type="button"
      className="register-play"
      aria-pressed={playing}
      aria-label={playing ? `Speler van ${name} sluiten` : `${name} afspelen`}
      title={playing ? "Speler sluiten" : "Afspelen in de Spotify-speler"}
      onClick={() => edit.togglePlay(row)}
    >
      {/* SVG in plaats van ▶/■ als tekst: een tekstteken staat nooit precies in het midden van de
          cirkel. De driehoek staat in zijn viewBox iets naar rechts (optisch midden, niet het
          geometrische), anders oogt hij links van het midden. */}
      <svg className="register-play-icon" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        {playing ? <rect x="2" y="2" width="6" height="6" rx="1" /> : <path d="M3.2 1.8 8.4 5 3.2 8.2Z" />}
      </svg>
    </button>
  );
}

/** De Spotify-speler ONDERIN HET TABELVAK (Dave): hij schuift omhoog zodra een track begint en weer omlaag
 *  bij sluiten. Hij ligt over het scrollvak heen, dat zelf onder de speler door scrolt; de ruimte onderin
 *  (.has-player) houdt de laatste rij bereikbaar. Eén speler tegelijk, want een iframe per rij maakt de
 *  pagina traag. Bij sluiten speelt eerst de animatie omlaag (`closing`), en pas daarna `onClosed`, dat de
 *  speler weghaalt.
 *
 *  De speler komt uit Spotify's iFrame API (trackEmbed.ts), zodat de afspeelknop hem meteen laat spelen:
 *  bij de eerste track zodra de speler klaar is, bij een volgende track via loadUri + play in dezelfde
 *  speler. De API vervangt het element dat hij krijgt door zijn iframe, dus dat element maakt dit effect
 *  zelf aan in `host`, buiten React om. Laadt de API niet, dan komt de kale embed, waarin je zelf op play
 *  klikt. */
function Player({
  row,
  closing,
  onClose,
  onClosed,
}: {
  row: RegisterRow;
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  const id = row.spotifyTrackId;
  const host = useRef<HTMLDivElement>(null);
  const region = useRef<HTMLDivElement>(null);
  const controller = useRef<SpotifyEmbedController | null>(null);
  // De track die nu in de speler hoort, voor de callback van createController: die komt pas later terug.
  const wanted = useRef(id);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!wanted.current) return;
    let cancelled = false;
    const firstUri = trackUri(wanted.current);
    loadSpotifyIframeApi().then(
      (api) => {
        if (cancelled || !host.current) return;
        const element = document.createElement("div");
        host.current.appendChild(element);
        api.createController(element, { uri: firstUri, width: "100%", height: 80 }, (ctrl) => {
          if (cancelled) return ctrl.destroy();
          controller.current = ctrl;
          ctrl.addListener("ready", () => ctrl.play());
          // Intussen een andere track gekozen: dan die.
          if (wanted.current && trackUri(wanted.current) !== firstUri) ctrl.loadUri(trackUri(wanted.current));
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      }
    );
    const box = host.current;
    return () => {
      cancelled = true;
      controller.current?.destroy();
      controller.current = null;
      box?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (wanted.current === id) return;
    wanted.current = id;
    if (!id || !controller.current) return;
    controller.current.loadUri(trackUri(id));
    controller.current.play();
  }, [id]);

  // De pagina is één site-header hoger dan het venster (_track-register.scss, .wrap--full): zolang die header
  // nog in beeld staat, valt de onderkant van het tabelvak -- en dus de speler -- eronder weg (Dave). Bij elke
  // gekozen track scrolt de pagina daarom tot de onderkant van het tabelvak, zodat de speler helemaal in beeld
  // komt; de breadcrumb-balk blijft bovenaan plakken.
  useEffect(() => {
    if (!id) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    region.current?.parentElement?.scrollIntoView?.({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [id]);

  // Terugval voor animationend: in een tabblad dat niet in beeld is slaat de browser de animatie over,
  // en dan komt dat event nooit -- de speler bleef dan halverwege het sluiten hangen. Iets langer dan de
  // animatie omlaag (0.18s, _track-register.scss).
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(onClosed, 300);
    return () => window.clearTimeout(timer);
  }, [closing, onClosed]);

  if (!id) return null;
  const name = row.dkjTitle || row.title || row.id;
  return (
    <div
      ref={region}
      className={`register-player${closing ? " is-closing" : ""}`}
      aria-label={`Spotify-speler: ${name}`}
      role="region"
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) onClosed();
      }}
    >
      {failed ? (
        <iframe
          key={id}
          className="register-player-frame"
          title={`Spotify-speler: ${name}`}
          src={trackEmbedUrl(id)}
          height={80}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      ) : (
        <div ref={host} className="register-player-frame" />
      )}
      <button type="button" className="register-player-close" aria-label="Speler sluiten" title="Speler sluiten" onClick={onClose}>
        <svg viewBox="0 0 8 8" aria-hidden="true" focusable="false">
          <path d="M1 1 7 7M7 1 1 7" />
        </svg>
      </button>
    </div>
  );
}

/** Zoveel artiest-ID's staan er als chip; bij meer wordt het een menu, net als bij de playlists (Dave). */
const ARTIST_IDS_INLINE = 1;

function ArtistIds({ ids, names, term }: { ids: string[]; names: string[]; term: string }) {
  if (ids.length === 0) return <Empty />;
  const chip = (id: string, i: number) => (
    <span key={id} className="register-chip" title={names[i]}>
      <Highlight text={id} term={term} />
    </span>
  );
  if (ids.length <= ARTIST_IDS_INLINE) return <div className="register-chips">{ids.map(chip)}</div>;
  // Net als bij de playlists: "3 artists", en bij een zoekopdracht de treffer op de knop.
  const hit = term ? ids.findIndex((id, i) => fold(`${id} ${names[i]}`).includes(term)) : -1;
  return (
    <Dropdown
      label={
        hit >= 0 ? (
          <>
            <Highlight text={ids[hit]} term={term} />
            <span className="register-menu-count">+{ids.length - 1}</span>
          </>
        ) : (
          `${ids.length} artists`
        )
      }
    >
      {ids.map((id, i) => (
        <span key={id} className="register-menu-item register-menu-item--static">
          <span className="register-menu-id"><Highlight text={id} term={term} /></span>
          <Highlight text={names[i]} term={term} />
        </span>
      ))}
    </Dropdown>
  );
}

/** De greep waarmee een rij versleept wordt, met pijl omhoog/omlaag als toetsenbordalternatief. Een span
 *  met role="button" in plaats van een <button>: Firefox laat een knop niet slepen. */
function DragHandle({ row, index, drag }: { row: RegisterRow; index: number; drag: DragEdit | null }) {
  if (!drag) return null;
  const name = row.dkjTitle || row.title || row.id;
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!drag.enabled || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    drag.move(index, index + (event.key === "ArrowUp" ? -1 : 1));
  };
  return (
    <span
      role="button"
      tabIndex={drag.enabled ? 0 : -1}
      className={`register-grip${drag.enabled ? "" : " is-disabled"}`}
      draggable={drag.enabled}
      aria-disabled={!drag.enabled}
      aria-label={`${name} verplaatsen (pijl omhoog of omlaag)`}
      title={drag.enabled ? "Sleep om de volgorde in de playlist te wijzigen" : drag.disabledReason}
      onDragStart={(event) => drag.start(index, event)}
      onDragEnd={drag.end}
      onKeyDown={onKeyDown}
    >
      <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">
        <path d="M2 2h2v2H2zM6 2h2v2H6zM2 7h2v2H2zM6 7h2v2H6zM2 12h2v2H2zM6 12h2v2H6z" />
      </svg>
    </span>
  );
}

/** De afspeelknop in een EIGEN KOLOM (Dave): vaste breedte, net genoeg voor het knopje. Hij staat in
 *  elke tabel helemaal links -- de gewone, de verborgen kolommen en de compacte (Dave, 31 oktober 2026). */
const PLAY_COLUMN: Column = {
  key: "play",
  field: "afspelen",
  width: "40px",
  className: "register-play-cell",
  cell: (row, _term, edit) => <PlayButton row={row} edit={edit} />,
};

/** De gewone kolommen, in volgorde. dkj_track_id, dkj_file, dkj_artist, dkj_artist_id en djcylow_mix staan
 *  er niet in (Dave); die staan in HIDDEN_COLUMNS, achter de switch, en op alle vijf zoeken kan altijd. */
const VISIBLE_COLUMNS: readonly Column[] = [
  PLAY_COLUMN,
  { key: "dkjTitle", field: "dkj_title", width: "22%", cell: (row, term) => <OneLine text={row.dkjTitle} term={term} className="register-title" /> },
  { key: "albumArtist", field: "dkj_albumartiest", width: "17%", cell: (row, term) => <OneLine text={row.albumArtist} term={term} className="register-album-artist" /> },
  {
    key: "year",
    field: "year",
    // Vaste breedte, zoals dkj_rating (Dave): het jaar moet altijd heel te zien zijn, ook op de smalste
    // tabel (900px), waar 5% het afkapte. De kop met zijn pijltje is het breedste wat erin moet.
    width: "64px",
    cell: (row, term) => <OneLine text={row.year} term={term} className="register-year" />,
  },
  {
    key: "playlists",
    field: "spotify_playlist",
    width: "19%",
    className: "register-playlists-cell",
    cell: (row, term) => (
      <OutLinkLabels
        links={row.playlists.map((p) => ({ key: p.id, name: p.name, href: playlistUrl(p.id) }))}
        site="Spotify"
        noun="playlists"
        term={term}
      />
    ),
  },
  {
    key: "genre",
    field: "dkj_genre",
    width: "6%",
    cell: (row, term) => (row.genre ? <span className="register-tag"><Highlight text={row.genre} term={term} /></span> : <Empty />),
  },
  {
    key: "bpm",
    field: "dkj_bpm",
    width: "7%",
    cell: (row, term) => (row.bpm ? <span className="register-tag"><Highlight text={row.bpm} term={term} /></span> : <Empty />),
  },
  {
    key: "rating",
    field: "dkj_rating",
    // Vaste breedte (Dave): symbool, "tier-8" en het potloodje moeten er altijd heel in passen, ook op
    // de smalste tabel (900px), waar 7% het getal afkapte.
    width: "104px",
    cell: (row, term, edit) => <Rating row={row} term={term} field={RATING_KEY} setRating={edit.setRating} />,
  },
  {
    key: "mixRating",
    field: "dkj_mix_rating",
    // Hoe graag je hem in de volgende mix wilt gebruiken (Dave, 31 oktober 2026); direct naast dkj_rating
    // en even breed. De kop heet "mix rating", zodat hij in die 104px past; de veldnaam staat in de tooltip.
    label: "mix rating",
    width: "104px",
    cell: (row, term, edit) => <Rating row={row} term={term} field={MIX_RATING_KEY} setRating={edit.setRating} />,
  },
  {
    key: "playcount",
    field: "spotify_playcount",
    // In de tabel heet hij "plays" (Dave): de kop bepaalt de breedte, want de cel is maar een getal van
    // hooguit drie cijfers. Met "playcount" was de kolom 96px, nu 76px; de veldnaam staat in de tooltip.
    label: "plays",
    // Vaste breedte, zoals year: de kop met zijn pijltje past er net heel in.
    width: "76px",
    cell: (row, term) => <OneLine text={row.playcount} term={term} className="register-playcount" />,
  },
  { key: "album", field: "dkj_album", width: "11%", cell: (row, term) => <Album album={row.album} candidates={row.albumCandidates} term={term} /> },
  { key: "groups", field: "dkj_group", width: "8%", cell: (row, term) => <Groups groups={row.groups} term={term} /> },
];

/** De kolommen die uit de gewone tabel zijn gelaten, te zien via de switch. */
const HIDDEN_COLUMNS: readonly Column[] = [
  PLAY_COLUMN,
  { key: "id", field: "dkj_track_id", width: "10%", cell: (row, term) => <OneLine text={row.id} term={term} className="register-id" /> },
  { key: "file", field: "dkj_file", width: "35%", cell: (row, term) => <OneLine text={row.file} term={term} className="register-file" /> },
  { key: "artist", field: "dkj_artist", width: "20%", cell: (row, term) => <OneLine text={row.artist} term={term} className="register-artist" /> },
  { key: "artistIds", field: "dkj_artist_id", width: "15%", cell: (row, term) => <ArtistIds ids={row.artistIds} names={row.artistNames} term={term} /> },
  {
    key: "mixes",
    field: "djcylow_mix",
    width: "20%",
    className: "register-playlists-cell",
    cell: (row, term) => (
      <OutLinkLabels
        links={row.mixes.map((m) => ({ key: m.slug, name: m.name, href: mixUrl(m.slug) }))}
        site="djcylow.com"
        noun="mixes"
        term={term}
      />
    ),
  },
];

const COLUMN_SETS: Record<ColumnSet, readonly Column[]> = { visible: VISIBLE_COLUMNS, hidden: HIDDEN_COLUMNS };

/** De kolommen van de compacte tabel (`compact`), in hun volgorde en met hun breedte daar: year, dkj_genre,
 *  dkj_bpm, plays, dkj_album en dkj_group zijn er niet relevant (Dave, 28 oktober 2026), de rest krijgt hun
 *  ruimte. Van de twee waarderingen staat alleen dkj_mix_rating erin, links van spotify_playlist: op een
 *  mixpagina telt hoe graag je een nummer in de mix wilt, niet hoe graag je het zelf luistert (Dave, 31
 *  oktober 2026). */
const COMPACT_WIDTHS: Partial<Record<Column["key"], string>> = {
  play: "40px",
  position: "48px",
  dkjTitle: "38%",
  albumArtist: "30%",
  mixRating: "104px",
  playlists: "32%",
};
/** De compacte tabel zonder playlist-volgorde (een mixpagina) opent op de hoogste waardering eerst (Dave, 28
 *  oktober 2026): tier-8 bovenaan. Sinds 31 oktober 2026 is dat dkj_mix_rating, de enige waardering die er nog
 *  in staat. Met `playlistOrder` (een werkbak) opent hij juist in de volgorde van de playlist op Spotify:
 *  bovenaan het nummer dat het meest kans maakt in de volgende mix, onderaan het minst -- die volgorde bepaal je
 *  zelf door te slepen. */
const COMPACT_SORT: RegisterSort = { key: "mixRating", dir: "desc" };
/** De plek van de rij in de compacte tabel, 1 tot en met n (Dave, 29 oktober 2026): volgt de getoonde
 *  volgorde, dus na het sorteren op een kop staat 1 weer bovenaan. */
const POSITION_COLUMN: Column = {
  key: "position",
  field: "plek",
  label: "#",
  width: "48px",
  className: "register-position-cell",
  cell: (_row, _term, _edit, position) => <span className="register-position">{nf.format(position)}</span>,
};
/** De sleepgreep vóór de afspeelknop, alleen in de tabel van een playlist (TrackRegister `playlistOrder`). */
const GRIP_COLUMN: Column = {
  key: "grip",
  field: "verslepen",
  width: "28px",
  className: "register-grip-cell",
  cell: (row, _term, edit, position) => <DragHandle row={row} index={position - 1} drag={edit.drag} />,
};
/** Zoveel nummers heeft een mix meestal (Dave, 29 oktober 2026): onder die rij trekt de compacte tabel een
 *  lijn, zodat je ziet dat de werkbak genoeg nummers heeft voor de volgende stap. */
const MIX_SIZE = 36;
const COMPACT_COLUMNS: readonly Column[] =Object.entries(COMPACT_WIDTHS).flatMap(([key, width]) => {
  const column = key === "position" ? POSITION_COLUMN : VISIBLE_COLUMNS.find((c) => c.key === key);
  return column && width ? [{ ...column, width }] : [];
});

export function TrackRegister({ rows: serverRows, artistCount, compact = false, playlistOrder }: TrackRegisterProps) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  // De volgorde die je net versleept hebt, over de rijen van de server heen gelegd tot de pagina na het
  // verplaatsen opnieuw gelezen is. Hij hoort bij precies die `serverRows`: komt er na router.refresh() een
  // nieuwe array binnen, dan vervalt hij vanzelf en geldt de volgorde van Spotify.
  const [moved, setMoved] = useState<{ base: RegisterRow[]; ids: string[] } | null>(null);
  const [moving, setMoving] = useState(false);
  // `base`: de serverRows waarbij de melding hoort; komt er een nieuwe stand binnen, dan is hij achterhaald.
  const [note, setNote] = useState<{ error: boolean; text: string; base?: RegisterRow[] } | null>(null);
  // Spotify heeft de verplaatsing, maar de snapshot niet: de plekken van deze pagina kloppen niet meer.
  // Slepen blijft uit tot er een nieuwe stand binnen is (Sync met Spotify).
  const [desyncedBase, setDesyncedBase] = useState<RegisterRow[] | null>(null);
  const initialRows = useMemo(() => {
    if (!moved || moved.base !== serverRows) return serverRows;
    const byId = new Map(serverRows.map((row) => [row.id, row]));
    return moved.ids.flatMap((id) => byId.get(id) ?? []);
  }, [serverRows, moved]);
  // De waarderingen die je op deze pagina hebt gekozen (Rating), per rij en per veld over de rijen van
  // de server heen gelegd: zo sorteren, zoeken en tellen ze meteen mee, zonder de pagina opnieuw te laden.
  const [ratings, setRatings] = useState<Record<string, Partial<Pick<RegisterRow, "rating" | "mixRating">>>>({});
  const rows = useMemo(
    () => initialRows.map((row) => (row.id in ratings ? { ...row, ...ratings[row.id] } : row)),
    [initialRows, ratings]
  );
  // De track in de speler (Player). Een rij, geen ID: de speler blijft staan als een filter de rij wegfiltert.
  const [playing, setPlaying] = useState<RegisterRow | null>(null);
  // Waar tijdens de animatie omlaag (Player); daarna gaat de speler echt weg.
  const [closing, setClosing] = useState(false);
  const finishClose = useCallback(() => {
    setPlaying(null);
    setClosing(false);
  }, []);
  const closePlayer = () => {
    // Zonder animatie (prefers-reduced-motion) komt er geen animationend, dus dan meteen weg.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) setPlaying(null);
    else setClosing(true);
  };
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const edit: CellEdit = {
    setRating: (trackId, field, rating) =>
      setRatings((prev) => ({ ...prev, [trackId]: { ...prev[trackId], [RATING_ROW_KEY[field]]: rating } })),
    playingId: playing && !closing ? playing.id : null,
    togglePlay: (row) => {
      if (playing?.id === row.id && !closing) return closePlayer();
      setClosing(false);
      setPlaying(row);
    },
    drag: null,
  };
  const [query, setQuery] = useState(DEFAULT_PREFS.query);
  const [yearFrom, setYearFrom] = useState(DEFAULT_PREFS.yearFrom);
  const [yearTo, setYearTo] = useState(DEFAULT_PREFS.yearTo);
  const [bpm, setBpm] = useState(DEFAULT_PREFS.bpm);
  const [genre, setGenre] = useState(DEFAULT_PREFS.genre);
  const [album, setAlbum] = useState(DEFAULT_PREFS.album);
  const [group, setGroup] = useState(DEFAULT_PREFS.group);
  const [sort, setSort] = useState<RegisterSort | null>(compact && !playlistOrder ? COMPACT_SORT : DEFAULT_PREFS.sort);
  const [columnSet, setColumnSet] = useState<ColumnSet>(DEFAULT_PREFS.columnSet);
  const [page, setPage] = useState(0);
  // Pas waar na mount (het effect hieronder): de server rendert zonder localStorage, dus vóór mount
  // moet de client-HTML gelijk zijn aan de lege beginstand hierboven (anders een hydration mismatch).
  // Ook de wachter voor het schrijf-effect verderop: schrijven vóór het herstel zou de opgeslagen
  // stand overschrijven met die lege beginstand.
  const [restored, setRestored] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const box = useRef<HTMLDivElement>(null);
  const goTo = (next: number) => {
    setPage(next);
    box.current?.scrollTo?.({ top: 0 });
  };

  // Zet alle negen velden in één keer -- gedeeld door het herstel-effect hieronder en "Filters wissen".
  const applyPrefs = (prefs: RegisterPrefs) => {
    setQuery(prefs.query);
    setYearFrom(prefs.yearFrom);
    setYearTo(prefs.yearTo);
    setBpm(prefs.bpm);
    setGenre(prefs.genre);
    setAlbum(prefs.album);
    setGroup(prefs.group);
    setSort(prefs.sort);
    setColumnSet(prefs.columnSet);
  };

  // Herstelt de bewaarde filterstand (registerPrefs.ts) na mount; ongeldige of corrupte waarden vallen
  // terug op hun standaardwaarde, dus dit rendert altijd.
  // Dit is bewust een synchronisatie met een externe bron (localStorage bestaat niet server-side), geen
  // render-afgeleide state: lezen vóór mount zou de server-HTML en de client-HTML laten verschillen.
  useEffect(() => {
    if (compact) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalig herstel ná mount, zie hierboven.
    applyPrefs(loadRegisterPrefs(PREFS_OPTIONS));
    setRestored(true);
  }, [compact]);

  // Bewaart elke wijziging, zodra het herstel hierboven gedaan is. `page` telt bewust niet mee: een
  // nieuw bezoek begint altijd op pagina 1.
  useEffect(() => {
    if (!restored) return;
    saveRegisterPrefs({ query, yearFrom, yearTo, bpm, genre, album, group, sort, columnSet });
  }, [restored, query, yearFrom, yearTo, bpm, genre, album, group, sort, columnSet]);

  const haystacks = useMemo(() => rows.map(searchText), [rows]);
  const bpmCounts = useMemo(() => countBy(rows, "bpm"), [rows]);
  const genreCounts = useMemo(() => countBy(rows, "genre"), [rows]);
  const albumCounts = useMemo(() => countBy(rows, "album"), [rows]);
  const groupCounts = useMemo(() => countBy(rows, "groups"), [rows]);
  const filtered = useMemo(
    () => filterRegister(rows, haystacks, { term: deferredQuery, bpm, genre, album, group, yearFrom, yearTo }),
    [rows, haystacks, deferredQuery, bpm, genre, album, group, yearFrom, yearTo]
  );
  const list = useMemo(() => sortRegister(filtered, sort), [filtered, sort]);

  const term = fold(deferredQuery.trim());
  const pages = compact ? 1 : Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = compact ? list : list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const multi = rows.filter((row) => row.artistIds.length > 1).length;
  const label = (value: string, n: number | undefined) => `${value} (${nf.format(n ?? 0)})`;
  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    goTo(0);
  };
  const orderable = compact && playlistOrder !== undefined;
  const columns = compact ? (orderable ? [GRIP_COLUMN, ...COMPACT_COLUMNS] : COMPACT_COLUMNS) : COLUMN_SETS[columnSet];
  const dragEnabled = orderable && sort === null && !moving && !refreshing && desyncedBase !== serverRows;

  /** Verplaatst de rij op tabelindex `from` naar `to`: eerst in de tabel (optimistisch), dan bij Spotify. Mislukt
   *  het, of blijkt de playlist intussen anders, dan komt de oude volgorde terug met de reden erbij -- er wordt
   *  nooit op verouderde plekken verplaatst (zie api/spotify/playlist-order). */
  async function moveRow(from: number, to: number) {
    if (!playlistOrder || !dragEnabled || to < 0 || to >= list.length) return;
    const positions = list.map((row) => playlistOrder.positions[row.id]);
    const plan = planPlaylistMove(positions, from, to);
    if (!plan) {
      if (positions[from] === undefined || positions[to] === undefined) {
        setNote({ error: true, text: "Deze rij staat volgens de snapshot niet in de playlist: klik eerst op Sync met Spotify." });
      }
      return;
    }
    const expectedStartId = playlistOrder.itemIds[plan.rangeStart];
    const targetPosition = positions[to];
    const expectedTargetId = targetPosition === undefined ? null : playlistOrder.itemIds[targetPosition];
    if (!expectedStartId || targetPosition === undefined || !expectedTargetId) {
      setNote({ error: true, text: "Deze plek heeft geen Spotify-track: klik eerst op Sync met Spotify." });
      return;
    }
    const previous = moved;
    setMoved({ base: serverRows, ids: moveItem(list, from, to).map((row) => row.id) });
    setMoving(true);
    setNote(null);
    try {
      const { refreshed, pending, rateLimitedUntil } = await savePlaylistOrder(playlistOrder.playlistId, playlistOrder.snapshotId, {
        ...plan,
        targetPosition,
        expectedStartId,
        expectedTargetId,
      });
      if (pending) {
        // Geen fout: de verplaatsing staat lokaal klaar (uitgestelde volgorde) en de pagina toont hem na de
        // verversing. Zonder `base`, zodat de melding die verversing overleeft; de volgende sleepactie wist hem.
        setNote({
          error: false,
          text: rateLimitedUntil
            ? "Bewaard in de hub; Spotify volgt zodra het weer kan."
            : "Bewaard in de hub; stuur de volgorde met de knop naar Spotify.",
        });
        startRefresh(() => router.refresh());
      } else if (refreshed) {
        startRefresh(() => router.refresh());
      } else {
        // Geen router.refresh(): dat zou de oude volgorde terugzetten terwijl Spotify de nieuwe heeft. De
        // getoonde volgorde blijft staan; slepen wacht tot Sync met Spotify een nieuwe stand brengt.
        setDesyncedBase(serverRows);
        setNote({ error: true, text: "Verplaatst in Spotify, maar de lijst bijwerken mislukte: klik op Sync met Spotify.", base: serverRows });
      }
    } catch (err) {
      setMoved(previous);
      if (err instanceof PlaylistOrderError && err.changed) startRefresh(() => router.refresh());
      setNote({ error: true, text: err instanceof PlaylistOrderError && err.changed ? (err.message) : `Verplaatsen mislukt: ${err instanceof Error ? err.message : "onbekende fout"}` });
    } finally {
      setMoving(false);
    }
  }
  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };
  edit.drag = orderable
    ? {
        enabled: dragEnabled,
        disabledReason: sort !== null ? "Zet het sorteren uit (klik de kop tot de pijl weg is) om te slepen" : "Even geduld: de vorige verplaatsing loopt nog",
        start: (index, event) => {
          setDragIndex(index);
          event.dataTransfer.effectAllowed = "move";
          // Firefox start een sleepactie alleen als er data is.
          event.dataTransfer.setData("text/plain", String(index));
          const rowEl = event.currentTarget.closest("tr");
          if (rowEl) event.dataTransfer.setDragImage(rowEl, 16, 16);
        },
        end: endDrag,
        move: (from, to) => void moveRow(from, to),
      }
    : null;
  // Eén switch: elke klik wisselt van set. De sortering hoort bij een kop die dan weg is, dus die vervalt.
  const toggleColumns = () => {
    setColumnSet(columnSet === "visible" ? "hidden" : "visible");
    setSort(null);
    goTo(0);
  };
  const currentPrefs: RegisterPrefs = { query, yearFrom, yearTo, bpm, genre, album, group, sort, columnSet };
  const showClearFilters = !isDefaultRegisterPrefs(currentPrefs);
  // Zet alles terug naar de standaardstand (en dus ook de opgeslagen stand, via het schrijf-effect).
  const clearFilters = () => {
    applyPrefs(DEFAULT_PREFS);
    goTo(0);
  };

  return (
    <section className="track-register">
      <div className="stats">
        <div className="stat"><b>{nf.format(rows.length)}</b><span>nummers</span></div>
        <div className="stat"><b>{nf.format(artistCount)}</b><span>artiesten</span></div>
        <div className="stat"><b>{nf.format(multi)}</b><span>met meer dan één artiest</span></div>
        <div className="stat"><b>{nf.format(rows.length - (bpmCounts.get(EMPTY_FILTER) ?? 0))}</b><span>met een dkj_bpm</span></div>
        <div className="stat"><b>{nf.format(rows.length - (albumCounts.get(EMPTY_FILTER) ?? 0) - (albumCounts.get(CANDIDATES_FILTER) ?? 0))}</b><span>met een dkj_album</span></div>
      </div>

      {!compact && (
        <>
          <div className="register-controls">
            <label className="playlist-search" htmlFor="register-q">
              <input
                id="register-q"
                type="search"
                placeholder="Zoek op ID, titel of artiest, bv. PRO02 of Firestarter"
                autoComplete="off"
                value={query}
                onChange={(e) => reset(setQuery)(e.target.value)}
              />
            </label>
            <button
              type="button"
              role="switch"
              className="register-column-switch"
              aria-checked={columnSet === "hidden"}
              title="Wissel tussen de zichtbare en de verborgen kolommen"
              onClick={toggleColumns}
            >
              <span className="register-column-switch-track" aria-hidden="true" />
              <span>verborgen kolommen</span>
            </button>
            <span className="register-count" aria-live="polite">
              {list.length === rows.length
                ? `${nf.format(rows.length)} nummers`
                : `${nf.format(list.length)} van ${nf.format(rows.length)} nummers`}
            </span>
          </div>

          {/* De filters staan in een eigen omkaderd vak (Dave), los van zoeken en de kolomschakelaar. */}
          <fieldset className="register-filters">
            <legend>Filters</legend>
            <div className="register-filter" role="group" aria-labelledby="register-year-label">
              <span id="register-year-label">year</span>
              <input
                className="register-year-input"
                type="number"
                inputMode="numeric"
                placeholder="van"
                aria-label="year van"
                value={yearFrom}
                onChange={(e) => reset(setYearFrom)(e.target.value)}
              />
              <span aria-hidden="true">–</span>
              <input
                className="register-year-input"
                type="number"
                inputMode="numeric"
                placeholder="tot"
                aria-label="year tot"
                value={yearTo}
                onChange={(e) => reset(setYearTo)(e.target.value)}
              />
            </div>
            <label className="register-filter" htmlFor="register-bpm">
              <span>dkj_bpm</span>
              <select id="register-bpm" value={bpm} onChange={(e) => reset(setBpm)(e.target.value)}>
                <option className="register-option-meta" value="">{label("Alle", rows.length)}</option>
                {DKJ_BPM_OPTIONS.map((option) => (
                  <option key={option} value={option}>{label(option, bpmCounts.get(option))}</option>
                ))}
                <option className="register-option-meta" value={EMPTY_FILTER}>{label("Leeg", bpmCounts.get(EMPTY_FILTER))}</option>
              </select>
            </label>
            <label className="register-filter" htmlFor="register-genre">
              <span>dkj_genre</span>
              <select id="register-genre" value={genre} onChange={(e) => reset(setGenre)(e.target.value)}>
                <option className="register-option-meta" value="">{label("Alle", rows.length)}</option>
                {DKJ_GENRE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{label(option, genreCounts.get(option))}</option>
                ))}
                <option className="register-option-meta" value={EMPTY_FILTER}>{label("Leeg", genreCounts.get(EMPTY_FILTER))}</option>
              </select>
            </label>
            <label className="register-filter" htmlFor="register-album">
              <span>dkj_album</span>
              <select id="register-album" value={album} onChange={(e) => reset(setAlbum)(e.target.value)}>
                <option className="register-option-meta" value="">{label("Alle", rows.length)}</option>
                {DKJ_ALBUM_COLOURS.map((colour) => (
                  <optgroup key={colour} label={colour}>
                    {/* De hele kleur, Light en Full samen (Dave): het totaal van de vier varianten. */}
                    <option value={colour}>
                      {label(colour, ALBUM_VARIANTS.reduce((n, variant) => n + (albumCounts.get(`${colour} ${variant}`) ?? 0), 0))}
                    </option>
                    {ALBUM_VARIANTS.map((variant) => {
                      const option = `${colour} ${variant}`;
                      return <option key={option} value={option}>{label(option, albumCounts.get(option))}</option>;
                    })}
                  </optgroup>
                ))}
                <option className="register-option-meta" value={EMPTY_FILTER}>{label("Leeg", albumCounts.get(EMPTY_FILTER))}</option>
                <option className="register-option-meta" value={CANDIDATES_FILTER}>{label("Meerdere kandidaten", albumCounts.get(CANDIDATES_FILTER))}</option>
              </select>
            </label>
            <label className="register-filter" htmlFor="register-group">
              <span>dkj_group</span>
              <select id="register-group" value={group} onChange={(e) => reset(setGroup)(e.target.value)}>
                <option className="register-option-meta" value="">{label("Alle", rows.length)}</option>
                {GROUP_OPTIONS.map((option) => (
                  <option key={option} value={option}>{label(option, groupCounts.get(option))}</option>
                ))}
                <option className="register-option-meta" value={EMPTY_FILTER}>{label("Leeg", groupCounts.get(EMPTY_FILTER))}</option>
              </select>
            </label>
            {showClearFilters && (
              <button type="button" className="pill-toggle playlist-clear-filters" onClick={clearFilters}>
                Filters wissen
              </button>
            )}
          </fieldset>
        </>
      )}

      {note && (!note.base || note.base === serverRows) && (
        <p className={`register-order-note${note.error ? " is-error" : ""}`} role="status">
          {note.text}
        </p>
      )}

      <div className="register-table-area">
        <div className="register-table-box" ref={box}>
          <table className="register-table">
            {/* Vaste verdeling van de breedte (table-layout: fixed), zodat alle kolommen altijd passen. */}
            <colgroup>
              {columns.map(({ key, width }) => (
                <col key={key} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map(({ key, field, label, className }) => {
                  if (key === "play" || key === "grip") {
                    return (
                      <th key={key} className={key === "grip" ? className : "register-play-cell"}>
                        <span className="register-hidden-label">{field}</span>
                      </th>
                    );
                  }
                  // De plek is geen veld en sorteert niet: hij volgt de volgorde van de andere koppen.
                  if (key === "position") {
                    return (
                      <th key={key} className={className} title="Plek in de tabel">
                        <code>{label}</code>
                      </th>
                    );
                  }
                  const dir = sort?.key === key ? sort.dir : null;
                  return (
                    <th key={key} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
                      <button
                        type="button"
                        className="register-sort"
                        title={`Sorteer op ${field}`}
                        onClick={() => reset(setSort)(nextSort(sort, key))}
                      >
                        <code>{label ?? field}</code>
                        <span className="register-sort-mark" aria-hidden="true">
                          {dir === "asc" ? "▲" : dir === "desc" ? "▼" : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="register-empty">Geen nummer gevonden met deze zoekterm en filters.</td>
                </tr>
              ) : (
                slice.map((row, i) => (
                  <tr
                    key={row.id}
                    className={
                      [
                        compact && i + 1 === MIX_SIZE && "register-mix-cut",
                        edit.playingId === row.id && "register-playing",
                        dragIndex === i && "register-dragging",
                        dragIndex !== null && overIndex === i && dragIndex !== i && (i > dragIndex ? "register-drop-after" : "register-drop-before"),
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    title={compact && i + 1 === MIX_SIZE ? `${MIX_SIZE} nummers: genoeg voor een mix` : undefined}
                    onDragOver={
                      dragIndex === null
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            if (overIndex !== i) setOverIndex(i);
                          }
                    }
                    onDrop={
                      dragIndex === null
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            const from = dragIndex;
                            endDrag();
                            void moveRow(from, i);
                          }
                    }
                  >
                    {columns.map(({ key, cell, className }) => (
                      <td key={key} className={className}>{cell(row, term, edit, i + 1)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {playing && (
          <Player
            row={playing}
            closing={closing}
            onClose={closePlayer}
            onClosed={finishClose}
          />
        )}
      </div>

      {!compact && (
        <div className="register-pager">
          <span className="register-count">
            {list.length > 0 &&
              `Nummer ${nf.format(current * PAGE_SIZE + 1)}–${nf.format(current * PAGE_SIZE + slice.length)} · pagina ${current + 1} van ${pages}`}
          </span>
          <div className="register-pager-buttons">
            <button type="button" disabled={current === 0} onClick={() => goTo(current - 1)}>Vorige</button>
            <button type="button" disabled={current >= pages - 1} onClick={() => goTo(current + 1)}>Volgende</button>
          </div>
        </div>
      )}
    </section>
  );
}
