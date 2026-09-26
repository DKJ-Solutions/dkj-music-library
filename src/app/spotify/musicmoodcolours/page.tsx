// Wereld-route: MMC (Music Mood Colours). Dun schilletje -- de eigenlijke fs-read/filter/rendering
// zit in WorldPage (components/spotify/WorldPage.tsx), gedeeld met de andere twee wereld-routes.
// MMC krijgt via `renderExtra` twee extra secties tussen de masthead en de playlist-lijst -- de
// BPM-overzichtssectie (BpmOverviewSection.tsx) en de ingang naar de brug met de mix-JSON's van de
// DJ Cylow-website (MixBridgeNav.tsx) -- zie de toelichting bij `renderExtra` in WorldPage.tsx.
import { WorldPage } from "@/components/spotify/WorldPage";
import { BpmOverviewSection } from "@/components/spotify/BpmOverviewSection";
import { MixBridgeNav } from "@/components/spotify/MixBridgeNav";

// Zelfde reden als /spotify/page.tsx: leest een fs-snapshot die buiten de build kan wijzigen.
export const dynamic = "force-dynamic";

export default function MusicMoodColoursPage() {
  return (
    <WorldPage
      world="mmc"
      renderExtra={(playlists) => (
        <>
          <BpmOverviewSection playlists={playlists} />
          <MixBridgeNav />
        </>
      )}
    />
  );
}
