// De pagina van één werkbak op /mixen/preparation/<playlist-id>: de tabel van /spotify/trackregister met alleen
// de tracks die in de playlist staan, zonder zoekbalk, filters en pager (TrackRegister `compact`). De card
// ernaartoe staat op /mixen/preparation. De sync-knop rechts in de kop haalt deze ene playlist opnieuw op bij
// Spotify (PlaylistSyncButton).
//
// De volgorde van de tabel IS de volgorde van de Spotify-playlist (Dave, 31 oktober 2026): bovenaan wat het
// meest kans maakt op de volgende mix. Slepen aan de greep verplaatst de track ook in Spotify
// (/api/spotify/playlist-order); Spotify is de enige plek waar die volgorde bewaard wordt.
import { notFound } from "next/navigation";
import { PlaylistSyncButton } from "@/components/spotify/PlaylistSyncButton";
import { TrackRegister } from "@/components/spotify/TrackRegister";
import { readPlaylistRegister } from "@/lib/library/readRegister";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { readSnapshot } from "@/lib/spotify/snapshotStore";

// Leest de Spotify-snapshot en de bibliotheek van schijf -- zelfde reden als /mixen/preparation.
export const dynamic = "force-dynamic";

export default async function PreparationPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const playlist = readSnapshot()?.playlists.find((p) => p.id === id && isPreparationPlaylist(p.name));
  if (!playlist) notFound();

  // Het register kent per track de playlists waarin hij staat (spotify_playlist), dus dit zijn precies de
  // tracks van deze werkbak zoals de bibliotheek ze kent -- in de volgorde van de playlist op Spotify
  // (Dave, 31 oktober 2026), met per rij zijn plek, zodat verslepen dezelfde plek bij Spotify raakt.
  const register = readPlaylistRegister(playlist);

  return (
    <main className="page-column wrap--full">
      <header className="masthead masthead--action">
        <p className="kicker">dkj-music-library · Mixen · Preparation</p>
        <h1>{playlist.name}</h1>
        <PlaylistSyncButton playlistId={playlist.id} playlistName={playlist.name} />
      </header>

      {"error" in register ? (
        <section className="layer">
          <p className="empty-note">
            De bibliotheek kon niet worden gelezen: {register.error}. Draai <code>npm run library:sync</code> en
            kijk in de serverconsole.
          </p>
        </section>
      ) : register.rows.length === 0 ? (
        <section className="layer">
          <p className="empty-note">Deze werkbak is nog leeg.</p>
        </section>
      ) : (
        <TrackRegister
          rows={register.rows}
          artistCount={register.artistCount}
          compact
          playlistOrder={{
            playlistId: playlist.id,
            snapshotId: playlist.snapshotId,
            positions: register.positions,
            itemIds: playlist.tracks.map((item) => item.track?.id ?? null),
          }}
        />
      )}
    </main>
  );
}
