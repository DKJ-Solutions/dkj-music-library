// De pagina van één werkbak op /mixen/preparation/<playlist-id>: de tabel van /spotify/trackregister met alleen
// de tracks die in de playlist staan, zonder zoekbalk, filters en pager (TrackRegister `compact`). De card
// ernaartoe staat op /mixen/preparation. De sync-knop rechts in de kop haalt deze ene playlist opnieuw op bij
// Spotify (PlaylistSyncButton).
//
// De volgorde van de tabel IS de volgorde van de Spotify-playlist (Dave, 31 oktober 2026): bovenaan wat het
// meest kans maakt op de volgende mix. Slepen aan de greep bewaart de verplaatsing ALTIJD eerst lokaal
// (/api/spotify/playlist-order, pendingOrderStore.ts; Dave, 5 november 2026: minder Spotify-calls, sneller
// slepen). De pagina toont die uitgestelde volgorde in plaats van die van Spotify, en de knop Push
// (PendingOrderButton) staat er altijd en stuurt alles in één keer naar Spotify; zonder verplaatsingen is hij
// uit. Fetch (PlaylistSyncButton) haalt de playlist op en behoudt de lokale volgorde: de uitgestelde volgorde
// wordt dan herbaseerd op de nieuwe stand (nieuwe tracks onderaan, verdwenen tracks weg). Hoort hij toch bij
// een andere snapshot dan de opgeslagen (een oude vermelding), dan toont de pagina de volgorde van Spotify en
// meldt de knop een conflict met alleen weggooien.
import { notFound } from "next/navigation";
import { PendingOrderButton } from "@/components/spotify/PendingOrderButton";
import { PlaylistSyncButton } from "@/components/spotify/PlaylistSyncButton";
import { TrackRegister } from "@/components/spotify/TrackRegister";
import { isPermutation, permuteBy } from "@/lib/library/pendingOrder";
import { readPlaylistRegister } from "@/lib/library/readRegister";
import { isPreparationPlaylist } from "@/lib/mixes/preparation";
import { getPendingOrder } from "@/lib/spotify/pendingOrderStore";
import { getRateLimitUntil } from "@/lib/spotify/rateLimitStore";
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
  // Een uitgestelde volgorde telt alleen als hij bij de opgeslagen snapshot hoort (na Fetch is hij herbaseerd);
  // anders zou hij indices van een andere lijst op deze toepassen. Dan geldt de volgorde van Spotify en meldt
  // de knop een conflict.
  const pending = getPendingOrder(playlist.id);
  const pendingValid =
    pending !== null && pending.baseSnapshotId === playlist.snapshotId && isPermutation(pending.order, playlist.tracks.length);
  // De playlist zoals hij getoond wordt: de plekken en item-ID's die de tabel doorgeeft bij slepen horen bij
  // de getoonde volgorde, dus ook bij een uitgestelde.
  const shown = pendingValid ? { ...playlist, tracks: permuteBy(playlist.tracks, pending.order) } : playlist;
  const register = readPlaylistRegister(shown);

  return (
    <main className="page-column wrap--full">
      <header className="masthead masthead--action">
        <p className="kicker">dkj-music-library · Mixen · Preparation</p>
        <h1>{playlist.name}</h1>
        <div className="playlist-sync-group">
          <PendingOrderButton
            playlistId={playlist.id}
            moveCount={pending?.moveCount ?? 0}
            conflict={pending !== null && !pendingValid}
            rateLimitedUntil={getRateLimitUntil()}
          />
          <PlaylistSyncButton playlistId={playlist.id} playlistName={playlist.name} />
        </div>
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
            itemIds: shown.tracks.map((item) => item.track?.id ?? null),
          }}
        />
      )}
    </main>
  );
}
