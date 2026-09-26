// De brug tussen de twee bronnen: de mix-JSON's van de DJ Cylow-website naast de MMC-playlists.
// Dun schilletje -- de fs-read + koppeling zit in lib/mixes/, de weergave in
// components/spotify/MixBridge.tsx.
import { MixBridge } from "@/components/spotify/MixBridge";

// Zelfde reden als de andere /spotify-routes: leest fs-bronnen (de snapshot én de mix-JSON's) die
// buiten de build kunnen wijzigen.
export const dynamic = "force-dynamic";

export default function MixBridgePage() {
  return <MixBridge />;
}
