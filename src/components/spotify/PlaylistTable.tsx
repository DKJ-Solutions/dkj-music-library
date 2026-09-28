"use client";
// De tabel van één playlist: zoeken op titel, artiest, album of toevoeger, en sorteren via de kopregel. Draagt de
// stijl van het Trackregister (.register-table in _track-register.scss), zodat de twee tabellen er
// hetzelfde uitzien. Geen bladeren: een playlist heeft honderden rijen, geen twaalfduizend.
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { nextSort, sortRows, type Sort } from "@/lib/sortRows";
import {
  filterPlaylistRows,
  formatDuration,
  playlistSortKey,
  trackUrl,
  type PlaylistTableColumn,
  type PlaylistTableRow,
} from "@/lib/spotify/playlistTable";

const nf = new Intl.NumberFormat("nl-NL");
const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

interface Column {
  key: PlaylistTableColumn;
  label: string;
  width: string;
  cell: (row: PlaylistTableRow) => ReactNode;
  className?: string;
}

const Empty = () => <span className="register-none">—</span>;

const COLUMNS: Column[] = [
  { key: "position", label: "#", width: "4%", cell: (row) => row.position, className: "register-year" },
  {
    key: "title",
    label: "Titel",
    width: "24%",
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
    width: "19%",
    cell: (row) => <span className="register-oneline" title={row.artists.join(", ")}>{row.artists.join(", ")}</span>,
  },
  {
    key: "album",
    label: "Album",
    width: "18%",
    cell: (row) => (
      <span className="register-oneline register-album-artist" title={row.album}>
        {row.album}
      </span>
    ),
  },
  { key: "year", label: "Jaar", width: "6%", cell: (row) => row.year ?? <Empty />, className: "register-year" },
  { key: "duration", label: "Duur", width: "6%", cell: (row) => formatDuration(row.durationMs), className: "register-year" },
  {
    key: "addedAt",
    label: "Toegevoegd",
    width: "10%",
    cell: (row) => (row.addedAt ? dateFormat.format(new Date(row.addedAt)) : <Empty />),
    className: "register-year",
  },
  {
    key: "addedBy",
    label: "Toegevoegd door",
    width: "13%",
    cell: (row) =>
      row.addedBy ? (
        <span className="register-oneline" title={row.addedBy}>
          {row.addedBy}
        </span>
      ) : (
        <Empty />
      ),
  },
];

export function PlaylistTable({ rows }: { rows: PlaylistTableRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort<PlaylistTableColumn> | null>(null);
  const deferredQuery = useDeferredValue(query);

  const list = useMemo(() => {
    const filtered = filterPlaylistRows(rows, deferredQuery);
    return sort ? sortRows(filtered, sort, playlistSortKey) : filtered;
  }, [rows, deferredQuery, sort]);

  const totalMs = rows.reduce((sum, row) => sum + row.durationMs, 0);
  const artistCount = new Set(rows.flatMap((row) => row.artists)).size;

  return (
    <section className="track-register">
      <div className="stats">
        <div className="stat"><b>{nf.format(rows.length)}</b><span>nummers</span></div>
        <div className="stat"><b>{nf.format(artistCount)}</b><span>artiesten</span></div>
        <div className="stat"><b>{formatDuration(totalMs)}</b><span>speelduur</span></div>
      </div>

      <div className="register-controls">
        <label className="playlist-search" htmlFor="playlist-q">
          <input
            id="playlist-q"
            type="search"
            placeholder="Zoek op titel, artiest, album of wie het toevoegde"
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
                <tr key={row.position}>
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
