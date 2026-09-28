"use client";
// De Classic Pop-tabel: elk nummer uit de Classic Pop-playlists één keer, met zoeken (ook op playlistnaam) en
// sorteren via de kopregel. Draagt dezelfde stijl als PlaylistTable.tsx en het Trackregister
// (.register-table in _track-register.scss). Geen bladeren: een paar duizend rijen is nog te doen, en zoeken
// maakt de lijst snel kort.
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { nextSort, sortRows, type Sort } from "@/lib/sortRows";
import { formatDuration, trackUrl } from "@/lib/spotify/playlistTable";
import {
  classicPopSortKey,
  filterClassicPopRows,
  type ClassicPopColumn,
  type ClassicPopRow,
} from "@/lib/spotify/classicPopTable";

const nf = new Intl.NumberFormat("nl-NL");
const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

interface Column {
  key: ClassicPopColumn;
  label: string;
  width: string;
  cell: (row: ClassicPopRow) => ReactNode;
  className?: string;
}

const Empty = () => <span className="register-none">—</span>;

const COLUMNS: Column[] = [
  {
    key: "title",
    label: "Titel",
    width: "22%",
    cell: (row) => (
      <a
        className="register-playlist"
        href={trackUrl(row.trackId)}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open "${row.title}" op Spotify`}
      >
        {row.title}
      </a>
    ),
  },
  {
    key: "artist",
    label: "Artiest",
    width: "17%",
    cell: (row) => <span className="register-oneline" title={row.artists.join(", ")}>{row.artists.join(", ")}</span>,
  },
  {
    key: "album",
    label: "Album",
    width: "16%",
    cell: (row) => (
      <span className="register-oneline register-album-artist" title={row.album}>
        {row.album}
      </span>
    ),
  },
  {
    key: "year",
    label: "Jaar",
    width: "6%",
    // Wijkt het jaar af van het album (een verzamelalbum, een heruitgave), dan zegt de tooltip dat.
    cell: (row) =>
      row.year === null ? (
        <Empty />
      ) : (
        <span title={row.albumYear !== null && row.albumYear !== row.year ? `Album op Spotify: ${row.albumYear}` : undefined}>
          {row.year}
        </span>
      ),
    className: "register-year",
  },
  { key: "duration", label: "Duur", width: "6%", cell: (row) => formatDuration(row.durationMs), className: "register-year" },
  {
    key: "playlists",
    label: "Playlists",
    width: "23%",
    // Het aantal vooraan, want daarop sorteert de kolom; de volledige namen in de tooltip.
    cell: (row) => (
      <span className="register-oneline" title={row.playlists.map((p) => p.name).join("\n")}>
        <b>{row.playlists.length}</b> · {row.playlists.map((p) => p.label).join(", ")}
      </span>
    ),
  },
  {
    key: "firstAddedAt",
    label: "Eerst toegevoegd",
    width: "10%",
    cell: (row) => (row.firstAddedAt ? dateFormat.format(new Date(row.firstAddedAt)) : <Empty />),
    className: "register-year",
  },
];

export function ClassicPopTable({ rows, playlistCount }: { rows: ClassicPopRow[]; playlistCount: number }) {
  const [query, setQuery] = useState("");
  // Een overzicht leest het best op artiest; de kopregel zet het om.
  const [sort, setSort] = useState<Sort<ClassicPopColumn> | null>({ column: "artist", direction: "asc" });
  const deferredQuery = useDeferredValue(query);

  const list = useMemo(() => {
    const filtered = filterClassicPopRows(rows, deferredQuery);
    return sort ? sortRows(filtered, sort, classicPopSortKey) : filtered;
  }, [rows, deferredQuery, sort]);

  const totalMs = rows.reduce((sum, row) => sum + row.durationMs, 0);
  const artistCount = new Set(rows.flatMap((row) => row.artists)).size;

  return (
    <section className="track-register">
      <div className="stats">
        <div className="stat"><b>{nf.format(rows.length)}</b><span>nummers</span></div>
        <div className="stat"><b>{nf.format(artistCount)}</b><span>artiesten</span></div>
        <div className="stat"><b>{nf.format(playlistCount)}</b><span>playlists</span></div>
        <div className="stat"><b>{formatDuration(totalMs)}</b><span>speelduur</span></div>
      </div>

      <div className="register-controls">
        <label className="playlist-search" htmlFor="classic-pop-q">
          <input
            id="classic-pop-q"
            type="search"
            placeholder="Zoek op titel, artiest, album of playlist"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="register-count" aria-live="polite">
          {list.length === rows.length
            ? `${nf.format(rows.length)} nummers`
            : `${nf.format(list.length)} van ${nf.format(rows.length)} nummers`}
        </span>
      </div>

      <div className="register-table-box">
        <table className="register-table">
          <colgroup>
            {COLUMNS.map(({ key, width }) => (
              <col key={key} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(({ key, label }) => {
                const dir = sort?.column === key ? sort.direction : null;
                return (
                  <th key={key} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
                    <button
                      type="button"
                      className="register-sort"
                      title={`Sorteer op ${label.toLowerCase()}`}
                      onClick={() => setSort(nextSort(sort, key))}
                    >
                      {label}
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
            {list.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="register-empty">Geen nummer gevonden met deze zoekterm.</td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.trackId}>
                  {COLUMNS.map(({ key, cell, className }) => (
                    <td key={key} className={className}>{cell(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
