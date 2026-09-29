"use client";
// De tabel van /spotify/trackregister: zoeken, filteren op een bereik van year, op dkj_bpm, dkj_genre, dkj_album en dkj_group, sorteren via de kopregel, en bladeren per
// 100 rijen (12.000+ rijen in één keer renderen maakt de pagina traag). Alle logica die geen React is
// zit in register.ts; hier alleen de weergave en de filterstand.
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DKJ_ALBUM_COLOURS, DKJ_ALBUM_OPTIONS, DKJ_BPM_OPTIONS, DKJ_GENRE_OPTIONS, DKJ_RATING_OPTIONS, TRACK_FIELDS } from "@/lib/library/fields";
import { mixUrl } from "@/lib/library/djcylowMix";
import { playlistUrl } from "@/lib/library/playlistLink";
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
 *  zodat alle kolommen altijd passen) en wat er in de cel staat. */
interface Column {
  key: SortKey;
  field: string;
  width: string;
  cell: (row: RegisterRow, term: string, edit: CellEdit) => ReactNode;
  className?: string;
}

/** Wat een bewerkbare cel nodig heeft: de waardering van een rij in de tabel zetten (Rating), en de
 *  track die in de speler staat kiezen (PlayButton). */
interface CellEdit {
  setRating: (trackId: string, rating: string | null) => void;
  playingId: string | null;
  togglePlay: (row: RegisterRow) => void;
}

/** Klik op een kop: oplopend, nog eens: aflopend, een derde keer: weer de oorspronkelijke volgorde. */
function nextSort(current: RegisterSort | null, key: SortKey): RegisterSort | null {
  if (current?.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

interface TrackRegisterProps {
  rows: RegisterRow[];
  artistCount: number;
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
function Rating({ row, term, setRating }: { row: RegisterRow; term: string; setRating: CellEdit["setRating"] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: string) {
    if (next === row.rating) return;
    const previous = row.rating;
    setRating(row.id, next);
    setBusy(true);
    setError(null);
    try {
      await saveRating(row.id, next);
    } catch (err) {
      setRating(row.id, previous);
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`register-rating${error ? " is-error" : ""}${busy ? " is-busy" : ""}`} title={error ? `Opslaan mislukt: ${error}` : undefined}>
      {row.rating ? (
        <span className="register-tag">
          <RatingSymbol rating={row.rating} />
          <Highlight text={row.rating} term={term} />
        </span>
      ) : (
        <Empty />
      )}
      <Dropdown
        label="✎"
        caret={false}
        toggleClassName="register-rating-edit"
        ariaLabel={`dkj_rating van ${row.id} wijzigen`}
        title="Waardering wijzigen"
      >
        {(close) =>
          DKJ_RATING_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className="register-menu-item register-menu-choice"
              aria-current={option === row.rating ? "true" : undefined}
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

/** De afspeelknop voor de titel: zet de track in de speler boven de tabel, of haalt hem er weer uit. Zonder
 *  spotify_track_id valt er niets af te spelen, dan staat er een lege plek zodat de titels recht blijven. */
function PlayButton({ row, edit }: { row: RegisterRow; edit: CellEdit }) {
  if (!row.spotifyTrackId) return <span className="register-play register-play--none" aria-hidden="true" />;
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

/** De gewone kolommen, in volgorde. dkj_track_id, dkj_file, dkj_artist, dkj_artist_id en djcylow_mix staan
 *  er niet in (Dave); die staan in HIDDEN_COLUMNS, achter de switch, en op alle vijf zoeken kan altijd. */
const VISIBLE_COLUMNS: readonly Column[] = [
  {
    key: "dkjTitle",
    field: "dkj_title",
    width: "22%",
    cell: (row, term, edit) => (
      <span className="register-title-cell">
        <PlayButton row={row} edit={edit} />
        <OneLine text={row.dkjTitle} term={term} className="register-title" />
      </span>
    ),
  },
  { key: "albumArtist", field: "dkj_albumartiest", width: "17%", cell: (row, term) => <OneLine text={row.albumArtist} term={term} className="register-album-artist" /> },
  { key: "year", field: "year", width: "5%", cell: (row, term) => <OneLine text={row.year} term={term} className="register-year" /> },
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
    width: "7%",
    cell: (row, term, edit) => <Rating row={row} term={term} setRating={edit.setRating} />,
  },
  { key: "album", field: "dkj_album", width: "11%", cell: (row, term) => <Album album={row.album} candidates={row.albumCandidates} term={term} /> },
  { key: "groups", field: "dkj_group", width: "8%", cell: (row, term) => <Groups groups={row.groups} term={term} /> },
];

/** De kolommen die uit de gewone tabel zijn gelaten, te zien via de switch. */
const HIDDEN_COLUMNS: readonly Column[] = [
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

export function TrackRegister({ rows: initialRows, artistCount }: TrackRegisterProps) {
  // De waarderingen die je op deze pagina hebt gekozen (Rating), over de rijen van de server
  // heen gelegd: zo sorteren, zoeken en tellen ze meteen mee, zonder de pagina opnieuw te laden.
  const [ratings, setRatings] = useState<Record<string, string | null>>({});
  const rows = useMemo(
    () => initialRows.map((row) => (row.id in ratings ? { ...row, rating: ratings[row.id] } : row)),
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
  const edit: CellEdit = {
    setRating: (trackId, rating) => setRatings((prev) => ({ ...prev, [trackId]: rating })),
    playingId: playing && !closing ? playing.id : null,
    togglePlay: (row) => {
      if (playing?.id === row.id && !closing) return closePlayer();
      setClosing(false);
      setPlaying(row);
    },
  };
  const [query, setQuery] = useState(DEFAULT_PREFS.query);
  const [yearFrom, setYearFrom] = useState(DEFAULT_PREFS.yearFrom);
  const [yearTo, setYearTo] = useState(DEFAULT_PREFS.yearTo);
  const [bpm, setBpm] = useState(DEFAULT_PREFS.bpm);
  const [genre, setGenre] = useState(DEFAULT_PREFS.genre);
  const [album, setAlbum] = useState(DEFAULT_PREFS.album);
  const [group, setGroup] = useState(DEFAULT_PREFS.group);
  const [sort, setSort] = useState<RegisterSort | null>(DEFAULT_PREFS.sort);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalig herstel ná mount, zie hierboven.
    applyPrefs(loadRegisterPrefs(PREFS_OPTIONS));
    setRestored(true);
  }, []);

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
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const multi = rows.filter((row) => row.artistIds.length > 1).length;
  const label = (value: string, n: number | undefined) => `${value} (${nf.format(n ?? 0)})`;
  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    goTo(0);
  };
  const columns = COLUMN_SETS[columnSet];
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
                {columns.map(({ key, field }) => {
                  const dir = sort?.key === key ? sort.dir : null;
                  return (
                    <th key={key} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
                      <button
                        type="button"
                        className="register-sort"
                        title={`Sorteer op ${field}`}
                        onClick={() => reset(setSort)(nextSort(sort, key))}
                      >
                        <code>{field}</code>
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
                slice.map((row) => (
                  <tr key={row.id}>
                    {columns.map(({ key, cell, className }) => (
                      <td key={key} className={className}>{cell(row, term, edit)}</td>
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
    </section>
  );
}
