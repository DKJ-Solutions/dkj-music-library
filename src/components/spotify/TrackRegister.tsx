"use client";
// De tabel van /spotify/trackregister: zoeken, filteren op dkj_bpm en dkj_album, sorteren via de kopregel, en bladeren per
// 100 rijen (12.000+ rijen in één keer renderen maakt de pagina traag). Alle logica die geen React is
// zit in register.ts; hier alleen de weergave en de filterstand.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DKJ_ALBUM_COLOURS, DKJ_BPM_OPTIONS, TRACK_FIELDS } from "@/lib/library/fields";
import { mixUrl } from "@/lib/library/djcylowMix";
import { playlistUrl } from "@/lib/library/playlistLink";
import {
  EMPTY_FILTER,
  countBy,
  filterRegister,
  fold,
  searchText,
  sortRegister,
  type RegisterRow,
  type RegisterSort,
  type SortKey,
} from "@/lib/library/register";

const PAGE_SIZE = 100;
const ALBUM_VARIANTS = ["Light (f)", "Full (f)", "Light (m)", "Full (m)"] as const;
const nf = new Intl.NumberFormat("nl-NL");
const GROUP_OPTIONS: readonly string[] = TRACK_FIELDS.find((field) => field.key === "dkj_group")?.options ?? [];

/** Eén kolom van de tabel: het veld, waarop hij sorteert, zijn deel van de breedte (table-layout: fixed,
 *  zodat alle kolommen altijd passen) en wat er in de cel staat. */
interface Column {
  key: SortKey;
  field: string;
  width: string;
  cell: (row: RegisterRow, term: string) => ReactNode;
  className?: string;
}

/** Welke kolommen de tabel toont: de gewone, of de kolommen die daar bewust uit zijn gelaten. */
type ColumnSet = "visible" | "hidden";

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
 *  scrollen of een ander venstermaat, want dan klopt de plek naast de knop niet meer. */
function Dropdown({ label, children }: { label: ReactNode; children: ReactNode }) {
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
        className="register-menu-toggle"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setPlace(open || !toggle.current ? null : placeMenu(toggle.current))}
      >
        {label}
        <span aria-hidden="true"> ▾</span>
      </button>
      {place &&
        createPortal(
          <div
            ref={list}
            className="register-menu-list"
            style={{ left: place.left, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
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

/** De gewone kolommen, in volgorde. dkj_track_id, dkj_file, dkj_artist en dkj_artist_id staan er niet in
 *  (Dave); die staan in HIDDEN_COLUMNS, achter de switch, en op alle vier zoeken kan altijd. */
const VISIBLE_COLUMNS: readonly Column[] = [
  { key: "dkjTitle", field: "dkj_title", width: "28%", cell: (row, term) => <OneLine text={row.dkjTitle} term={term} className="register-title" /> },
  { key: "albumArtist", field: "dkj_albumartiest", width: "19%", cell: (row, term) => <OneLine text={row.albumArtist} term={term} className="register-album-artist" /> },
  {
    key: "playlists",
    field: "spotify_playlist",
    width: "14%",
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
    key: "mixes",
    field: "djcylow_mix",
    width: "13%",
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
  {
    key: "bpm",
    field: "dkj_bpm",
    width: "7%",
    cell: (row, term) => (row.bpm ? <span className="register-tag"><Highlight text={row.bpm} term={term} /></span> : <Empty />),
  },
  { key: "album", field: "dkj_album", width: "11%", cell: (row, term) => <Album album={row.album} candidates={row.albumCandidates} term={term} /> },
  { key: "groups", field: "dkj_group", width: "8%", cell: (row, term) => <Groups groups={row.groups} term={term} /> },
];

/** De kolommen die uit de gewone tabel zijn gelaten, te zien via de switch. */
const HIDDEN_COLUMNS: readonly Column[] = [
  { key: "id", field: "dkj_track_id", width: "12%", cell: (row, term) => <OneLine text={row.id} term={term} className="register-id" /> },
  { key: "file", field: "dkj_file", width: "45%", cell: (row, term) => <OneLine text={row.file} term={term} className="register-file" /> },
  { key: "artist", field: "dkj_artist", width: "25%", cell: (row, term) => <OneLine text={row.artist} term={term} className="register-artist" /> },
  { key: "artistIds", field: "dkj_artist_id", width: "18%", cell: (row, term) => <ArtistIds ids={row.artistIds} names={row.artistNames} term={term} /> },
];

const COLUMN_SETS: Record<ColumnSet, readonly Column[]> = { visible: VISIBLE_COLUMNS, hidden: HIDDEN_COLUMNS };

export function TrackRegister({ rows, artistCount }: TrackRegisterProps) {
  const [query, setQuery] = useState("");
  const [bpm, setBpm] = useState("");
  const [album, setAlbum] = useState("");
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<RegisterSort | null>(null);
  const [columnSet, setColumnSet] = useState<ColumnSet>("visible");
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const box = useRef<HTMLDivElement>(null);
  const goTo = (next: number) => {
    setPage(next);
    box.current?.scrollTo?.({ top: 0 });
  };

  const haystacks = useMemo(() => rows.map(searchText), [rows]);
  const bpmCounts = useMemo(() => countBy(rows, "bpm"), [rows]);
  const albumCounts = useMemo(() => countBy(rows, "album"), [rows]);
  const groupCounts = useMemo(() => countBy(rows, "groups"), [rows]);
  const filtered = useMemo(
    () => filterRegister(rows, haystacks, { term: deferredQuery, bpm, album, group }),
    [rows, haystacks, deferredQuery, bpm, album, group]
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
  // Een andere set kolommen: de sortering hoort bij een kop die nu weg is, dus die vervalt.
  const switchColumns = (next: ColumnSet) => {
    if (next === columnSet) return;
    setColumnSet(next);
    setSort(null);
    goTo(0);
  };

  return (
    <section className="track-register">
      <div className="stats">
        <div className="stat"><b>{nf.format(rows.length)}</b><span>nummers</span></div>
        <div className="stat"><b>{nf.format(artistCount)}</b><span>artiesten</span></div>
        <div className="stat"><b>{nf.format(multi)}</b><span>met meer dan één artiest</span></div>
        <div className="stat"><b>{nf.format(rows.length - (bpmCounts.get(EMPTY_FILTER) ?? 0))}</b><span>met een dkj_bpm</span></div>
        <div className="stat"><b>{nf.format(rows.length - (albumCounts.get(EMPTY_FILTER) ?? 0))}</b><span>met een dkj_album</span></div>
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
        <label className="register-filter" htmlFor="register-bpm">
          <span>dkj_bpm</span>
          <select id="register-bpm" value={bpm} onChange={(e) => reset(setBpm)(e.target.value)}>
            <option value="">{label("Alle", rows.length)}</option>
            {DKJ_BPM_OPTIONS.map((option) => (
              <option key={option} value={option}>{label(option, bpmCounts.get(option))}</option>
            ))}
            <option value={EMPTY_FILTER}>{label("Leeg", bpmCounts.get(EMPTY_FILTER))}</option>
          </select>
        </label>
        <label className="register-filter" htmlFor="register-album">
          <span>dkj_album</span>
          <select id="register-album" value={album} onChange={(e) => reset(setAlbum)(e.target.value)}>
            <option value="">{label("Alle", rows.length)}</option>
            {DKJ_ALBUM_COLOURS.map((colour) => (
              <optgroup key={colour} label={colour}>
                {ALBUM_VARIANTS.map((variant) => {
                  const option = `${colour} ${variant}`;
                  return <option key={option} value={option}>{label(option, albumCounts.get(option))}</option>;
                })}
              </optgroup>
            ))}
            <option value={EMPTY_FILTER}>{label("Leeg", albumCounts.get(EMPTY_FILTER))}</option>
          </select>
        </label>
        <label className="register-filter" htmlFor="register-group">
          <span>dkj_group</span>
          <select id="register-group" value={group} onChange={(e) => reset(setGroup)(e.target.value)}>
            <option value="">{label("Alle", rows.length)}</option>
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>{label(option, groupCounts.get(option))}</option>
            ))}
            <option value={EMPTY_FILTER}>{label("Leeg", groupCounts.get(EMPTY_FILTER))}</option>
          </select>
        </label>
        <div className="register-column-switch" role="group" aria-label="Kolommen">
          <button
            type="button"
            className="pill-toggle"
            aria-pressed={columnSet === "visible"}
            data-active={columnSet === "visible"}
            onClick={() => switchColumns("visible")}
          >
            Zichtbare kolommen
          </button>
          <button
            type="button"
            className="pill-toggle"
            aria-pressed={columnSet === "hidden"}
            data-active={columnSet === "hidden"}
            onClick={() => switchColumns("hidden")}
          >
            Verborgen kolommen
          </button>
        </div>
        <span className="register-count" aria-live="polite">
          {list.length === rows.length
            ? `${nf.format(rows.length)} nummers`
            : `${nf.format(list.length)} van ${nf.format(rows.length)} nummers`}
        </span>
      </div>

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
                    <td key={key} className={className}>{cell(row, term)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
