// /spotify/maple-classic -- een eigen pagina voor één playlist: "Maple Classic 2026 LAN" (van Jellootje,
// dus een gedeelde playlist, geen eigen). Leest de Spotify-snapshot, zoals de wereld-routes; de rijen
// komen uit playlistTableRows.ts, de weergave uit PlaylistTable.tsx.
import Link from "next/link";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { openLibrary } from "@/lib/library/libraryFile";
import { foundReleaseYears, readReleaseYearCache } from "@/lib/musicbrainz/cacheStore";
import { libraryYearsBySpotifyId, toPlaylistTableRows, userNamesFromSnapshot } from "@/lib/spotify/playlistTableRows";
import { playlistUrl } from "@/lib/library/playlistLink";
import { PlaylistTable } from "@/components/spotify/PlaylistTable";
import SyncButton from "../SyncButton";

// Zelfde reden als /spotify/page.tsx: leest een fs-snapshot die buiten de build kan wijzigen.
export const dynamic = "force-dynamic";

const PLAYLIST_ID = "21C8ylLvP9fDneF86KAKlY";

// De jaren uit het Trackregister (zie playlistTableRows.ts). Lukt het lezen niet, dan toont de tabel het
// albumjaar: een minder precies jaar is beter dan geen pagina.
function readLibraryYears(): Map<string, number> {
  try {
    const { db } = openLibrary();
    try {
      return libraryYearsBySpotifyId(db);
    } finally {
      db.close();
    }
  } catch (err) {
    console.error("[spotify/maple-classic] bibliotheek lezen mislukt, de tabel toont het albumjaar:", err);
    return new Map();
  }
}

export default function MapleClassicPage() {
  const snapshot = readSnapshot();
  const playlist = snapshot?.playlists.find((p) => p.id === PLAYLIST_ID) ?? null;
  // readReleaseYearCache() valt bij een lees- of parseerfout al terug op een lege cache (zie
  // cacheStore.ts), dus de tabel toont dan gewoon het Trackregister- of albumjaar.
  const rows =
    snapshot && playlist
      ? toPlaylistTableRows(playlist, userNamesFromSnapshot(snapshot), readLibraryYears(), foundReleaseYears(readReleaseYearCache()))
      : null;

  return (
    <main className="wrap wrap--full">
      <header className="masthead">
        <Link href="/spotify" className="world-back-link">
          ← Terug naar alle playlists
        </Link>
        <p className="kicker">dkj-music-library · Playlist</p>
        <h1>{playlist?.name ?? "Maple Classic 2026 LAN"}</h1>
        {playlist && (
          <p className="lede">
            Van {playlist.owner.displayName ?? playlist.owner.id} ·{" "}
            <a href={playlistUrl(PLAYLIST_ID)} target="_blank" rel="noopener noreferrer" className="accent-text">
              open op Spotify ↗
            </a>
          </p>
        )}
        {/* Dezelfde knop als op /spotify: haalt een nieuwe snapshot op en ververst daarna deze pagina, zodat
            een wijziging in Spotify (bijv. verwijderde nummers) hier zichtbaar wordt. */}
        <p className="empty-note" style={{ marginTop: "10px" }}>
          {snapshot
            ? `Laatste snapshot: gesynchroniseerd op ${new Date(snapshot.syncedAt).toLocaleString("nl-NL")}.`
            : "Nog geen snapshot."}
        </p>
        <SyncButton />
      </header>

      {rows ? (
        <PlaylistTable rows={rows} />
      ) : (
        <section className="layer">
          <p className="empty-note">
            {snapshot ? "Deze playlist staat niet in de snapshot" : "Nog geen snapshot"} -- start een sync op{" "}
            <Link href="/spotify" className="accent-text">
              /spotify
            </Link>
            .
          </p>
        </section>
      )}
    </main>
  );
}
