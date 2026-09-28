// /spotify/maple-classic -- een eigen pagina voor één playlist: "Maple Classic 2026 LAN" (van Jellootje,
// dus een gedeelde playlist, geen eigen). Leest de Spotify-snapshot, zoals de wereld-routes; de rijen
// komen uit playlistTableRows.ts, de weergave uit PlaylistTable.tsx.
import Link from "next/link";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { toPlaylistTableRows } from "@/lib/spotify/playlistTableRows";
import { playlistUrl } from "@/lib/library/playlistLink";
import { PlaylistTable } from "@/components/spotify/PlaylistTable";

// Zelfde reden als /spotify/page.tsx: leest een fs-snapshot die buiten de build kan wijzigen.
export const dynamic = "force-dynamic";

const PLAYLIST_ID = "21C8ylLvP9fDneF86KAKlY";

export default function MapleClassicPage() {
  const snapshot = readSnapshot();
  const playlist = snapshot?.playlists.find((p) => p.id === PLAYLIST_ID) ?? null;

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
      </header>

      {playlist ? (
        <PlaylistTable rows={toPlaylistTableRows(playlist)} />
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
