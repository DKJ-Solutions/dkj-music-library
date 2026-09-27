"use client";
// De tabel van /spotify/trackregister: zoeken, filteren op dkj_bpm en dkj_album, sorteren via de kopregel, en bladeren per
// 100 rijen (12.000+ rijen in één keer renderen maakt de pagina traag). Alle logica die geen React is
// zit in register.ts; hier alleen de weergave en de filterstand.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DKJ_ALBUM_COLOURS, DKJ_BPM_OPTIONS, TRACK_FIELDS } from "@/lib/library/fields";
import { playlistUrl, type PlaylistLink } from "@/lib/library/playlistLink";
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

/** De kolommen van de tabel, in volgorde: het veld en waarop hij sorteert. */
const COLUMNS: readonly { key: SortKey; field: string }[] = [
  { key: "id", field: "dkj_track_id" },
  { key: "file", field: "dkj_file" },
  { key: "artist", field: "dkj_artist" },
  { key: "albumArtist", field: "dkj_albumartiest" },
  { key: "artistIds", field: "dkj_artist_ids" },
  { key: "playlists", field: "spotify_playlist" },
  { key: "bpm", field: "dkj_bpm" },
  { key: "album", field: "dkj_album" },
  { key: "groups", field: "dkj_group" },
];

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

function PlaylistLabel({ playlist, term, className }: { playlist: PlaylistLink; term: string; className: string }) {
  return (
    <a
      className={className}
      href={playlistUrl(playlist.id)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open "${playlist.name}" op Spotify`}
    >
      <Highlight text={playlist.name} term={term} />
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

/** Eén playlist: een label dat hem opent. Meer dan één: een menu van links. */
function PlaylistLabels({ playlists, term }: { playlists: PlaylistLink[]; term: string }) {
  if (playlists.length === 0) return <Empty />;
  if (playlists.length === 1) return <PlaylistLabel playlist={playlists[0]} term={term} className="register-playlist" />;
  // Zoekt iemand op een playlistnaam, dan staat die treffer op de knop, zodat je ziet waarom de rij er staat.
  const hit = term ? playlists.find((playlist) => fold(playlist.name).includes(term)) : undefined;
  return (
    <Dropdown
      label={
        hit ? (
          <>
            <Highlight text={hit.name} term={term} />
            <span className="register-menu-count">+{playlists.length - 1}</span>
          </>
        ) : (
          `${playlists.length} playlists`
        )
      }
    >
      {playlists.map((playlist) => (
        <PlaylistLabel key={playlist.id} playlist={playlist} term={term} className="register-menu-item" />
      ))}
    </Dropdown>
  );
}

/** Zoveel artiest-ID's staan er als chip; bij meer wordt het een menu, net als bij de playlists (Dave). */
const ARTIST_IDS_INLINE = 1;

function ArtistIds({ ids, names, term }: { ids: string[]; names: string[]; term: string }) {
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

/** Tekst die op één regel afgekapt wordt, met de volledige tekst als tooltip. */
function OneLine({ text, term, className }: { text: string | null; term: string; className: string }) {
  if (!text) return <Empty />;
  return (
    <span className={`register-oneline ${className}`} title={text}>
      <Highlight text={text} term={term} />
    </span>
  );
}

export function TrackRegister({ rows, artistCount }: TrackRegisterProps) {
  const [query, setQuery] = useState("");
  const [bpm, setBpm] = useState("");
  const [album, setAlbum] = useState("");
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<RegisterSort | null>(null);
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
            <col style={{ width: "10%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(({ key, field }) => {
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
                <td colSpan={9} className="register-empty">Geen nummer gevonden met deze zoekterm en filters.</td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr key={row.id}>
                  <td className="register-id"><Highlight text={row.id} term={term} /></td>
                  <td><OneLine text={row.file} term={term} className="register-file" /></td>
                  <td><OneLine text={row.artist} term={term} className="register-artist" /></td>
                  <td><OneLine text={row.albumArtist} term={term} className="register-album-artist" /></td>
                  <td><ArtistIds ids={row.artistIds} names={row.artistNames} term={term} /></td>
                  <td className="register-playlists-cell"><PlaylistLabels playlists={row.playlists} term={term} /></td>
                  <td>{row.bpm ? <span className="register-tag"><Highlight text={row.bpm} term={term} /></span> : <Empty />}</td>
                  <td>{row.album ? <AlbumTag album={row.album} term={term} /> : <Empty />}</td>
                  <td><Groups groups={row.groups} term={term} /></td>
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
