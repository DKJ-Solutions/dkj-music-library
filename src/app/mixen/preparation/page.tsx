// Preparation op /mixen/preparation: één grid met een card-link per Spotify-playlist die op "Vol. X" eindigt
// -- de werkbakken voor mixen die nog gemaakt moeten worden (lib/mixes/preparation.ts), met een stip in de
// kleur van de playlist op de plek van het icoon. Elke card drilt door naar /mixen/preparation/<id>. De
// card ernaartoe staat op de hub /mixen, naast Published en Planned.
import Link from "next/link";
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { preparationHref, preparationPlaylists } from "@/lib/mixes/preparation";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { pageTitle } from "@/lib/pages";

// Leest de Spotify-snapshot van schijf, en die wijzigt buiten de build -- zelfde reden als de /spotify-routes.
export const dynamic = "force-dynamic";

export default function MixenPreparationPage() {
  const snapshot = readSnapshot();
  const cards: PageCard[] = preparationPlaylists(snapshot?.playlists ?? []).map(({ playlist, parsed }) => ({
    href: preparationHref(playlist.id),
    icon: "music",
    dot: parsed.color?.toLowerCase(),
    label: playlist.name,
    sub: `${playlist.trackCount} tracks`,
  }));

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen/preparation")}</h1>
      </header>

      <section className="layer">
        {cards.length > 0 ? (
          <PageCardGrid cards={cards} />
        ) : (
          <p className="empty-note">
            {snapshot ? "Er staat geen playlist op Vol. X in de snapshot" : "Nog geen snapshot"} -- start een sync op{" "}
            <Link href="/spotify/verbinding" className="accent-text">
              /spotify/verbinding
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}
