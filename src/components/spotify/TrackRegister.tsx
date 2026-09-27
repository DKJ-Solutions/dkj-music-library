"use client";
// De tabel van /spotify/trackregister: zoeken, filteren op dkj_bpm en dkj_album, en bladeren per
// 100 rijen (12.000+ rijen in één keer renderen maakt de pagina traag). Alle logica die geen React is
// zit in register.ts; hier alleen de weergave en de filterstand.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DKJ_ALBUM_COLOURS, DKJ_BPM_OPTIONS } from "@/lib/library/fields";
import { playlistUrl, type PlaylistLink } from "@/lib/library/playlistLink";
import {
  EMPTY_FILTER,
  countBy,
  filterRegister,
  fold,
  searchText,
  type RegisterRow,
} from "@/lib/library/register";

const PAGE_SIZE = 100;
const ALBUM_VARIANTS = ["Light (f)", "Full (f)", "Light (m)", "Full (m)"] as const;
const nf = new Intl.NumberFormat("nl-NL");

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

/** Een knop die een menu opent, voor een cel die anders op twee regels zou komen. Het menu sluit bij
 *  een klik ernaast of met Escape. */
function Dropdown({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menu.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="register-menu" ref={menu}>
      <button
        type="button"
        className="register-menu-toggle"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {label}
        <span aria-hidden="true"> ▾</span>
      </button>
      {open && <div className="register-menu-list">{children}</div>}
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

/** Zoveel artiest-ID's staan er naast elkaar; bij meer wordt het een menu, zodat de rij één regel blijft. */
const ARTIST_IDS_INLINE = 2;

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
  const list = useMemo(
    () => filterRegister(rows, haystacks, { term: deferredQuery, bpm, album }),
    [rows, haystacks, deferredQuery, bpm, album]
  );

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
        <span className="register-count" aria-live="polite">
          {list.length === rows.length
            ? `${nf.format(rows.length)} nummers`
            : `${nf.format(list.length)} van ${nf.format(rows.length)} nummers`}
        </span>
      </div>

      <div className="register-table-box" ref={box}>
        <table className="register-table">
          <thead>
            <tr>
              <th><code>dkj_track_id</code></th>
              <th><code>dkj_file</code></th>
              <th><code>dkj_albumartiest</code></th>
              <th><code>dkj_artist</code></th>
              <th><code>dkj_artist_ids</code></th>
              <th><code>dkj_playlists</code></th>
              <th><code>dkj_bpm</code></th>
              <th><code>dkj_album</code></th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="register-empty">Geen nummer gevonden met deze zoekterm en filters.</td>
              </tr>
            ) : (
              slice.map((row) => (
                <tr key={row.id}>
                  <td className="register-id"><Highlight text={row.id} term={term} /></td>
                  <td><OneLine text={row.file} term={term} className="register-file" /></td>
                  <td><OneLine text={row.albumArtist} term={term} className="register-album-artist" /></td>
                  <td><OneLine text={row.artist} term={term} className="register-artist" /></td>
                  <td><ArtistIds ids={row.artistIds} names={row.artistNames} term={term} /></td>
                  <td className="register-playlists-cell"><PlaylistLabels playlists={row.playlists} term={term} /></td>
                  <td>{row.bpm ? <span className="register-tag"><Highlight text={row.bpm} term={term} /></span> : <Empty />}</td>
                  <td>{row.album ? <AlbumTag album={row.album} term={term} /> : <Empty />}</td>
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
