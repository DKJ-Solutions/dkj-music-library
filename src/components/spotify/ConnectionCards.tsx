// De sectie Connection op /spotify (Dave, #122): een h2 met twee kaarten eronder. Login regelt het inloggen
// -- de status, de knop, een login-fout en de host-melding --, Sync de volledige sync (SyncButton.tsx).
// Server Component: leest de tokens en de verrijkte snapshot van schijf (Node's `fs`). De OAuth-callback en
// het loskoppelen komen terug op /spotify (api/auth/callback/spotify, api/auth/logout/spotify), met
// ?connected=1 of ?error=<code> -- die query geeft de pagina hier door.
import { headers } from "next/headers";
import { readTokens } from "@/lib/spotify/tokenStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { getSpotifyRedirectUri } from "@/lib/spotify/config";
import { findRedirectHostMismatch } from "@/lib/spotify/redirectHost";
import SyncButton from "@/components/spotify/SyncButton";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "De login-poging kon niet worden geverifieerd (state komt niet overeen). Probeer opnieuw.",
  token_exchange_failed: "Het inwisselen van de code voor tokens is mislukt. Zie de serverconsole (het venster waarin `npm run dev` draait) voor details.",
};

export default async function ConnectionCards({ params }: { params: { connected?: string; error?: string } }) {
  const hostMismatch = findRedirectHostMismatch(
    (await headers()).get("host"),
    getSpotifyRedirectUri(),
    "/spotify"
  );
  const tokens = readTokens();
  const enriched = getEnrichedSnapshot();
  // Sinds de login-route zichzelf op de juiste host zet (api/auth/login/spotify) hóórt een
  // state_mismatch hier niet meer door het adres te komen. Komt hij tóch voor terwijl de hosts
  // uiteenlopen, dan is dat waardevolle informatie -- dan heeft de hop niet gedaan wat hij moest doen --
  // dus blijft de melding die oorzaak noemen, nu als "onverwacht" in plaats van als instructie.
  const errorMessage = params.error
    ? params.error === "state_mismatch" && hostMismatch
      ? `De login-poging kon niet worden geverifieerd (state komt niet overeen), terwijl je de app op ${hostMismatch.browserHost} hebt geopend en de callback op ${hostMismatch.redirectHost} binnenkomt. Dat zou de login-route zelf moeten hebben rechtgezet, dus dit is onverwacht. Open de app op ${hostMismatch.correctUrl} en probeer het daar.`
      : (ERROR_MESSAGES[params.error] ?? `Onbekende fout: ${params.error}`)
    : null;

  const totalTracks = enriched ? enriched.playlists.reduce((sum, p) => sum + p.trackCount, 0) : 0;

  return (
    <div className="grid-2">
      <div className="grid__head">
        <h2>Connection</h2>
      </div>
      <section className="card">
        <div className="card__head verbinding-head">
          <div>
            <h3 className="card__title">Login</h3>
            <p className="card__sub">
              {tokens
                ? `Verbonden. Toegangstoken verloopt ${new Date(tokens.expiresAt).toLocaleString("nl-NL")}.`
                : "Niet verbonden. Log in om je playlists op te halen."}
            </p>
          </div>
          {tokens ? (
            <form action="/api/auth/logout/spotify" method="POST">
              <button type="submit" className="btn">
                Loskoppelen
              </button>
            </form>
          ) : (
            <a className="btn btn--primary" href="/api/auth/login/spotify">
              Inloggen bij Spotify
            </a>
          )}
        </div>

        {errorMessage && <p className="msg msg--warn verbinding-result">{errorMessage}</p>}
        {params.connected && !params.error && (
          <p className="msg pos verbinding-result">Zojuist verbonden met Spotify.</p>
        )}
        {/* De login-route zet de host zelf recht, dus inloggen werkt hier gewoon; alleen het adres in de balk
            verandert onderweg, en dat wil je één keer uitgelegd krijgen. */}
        {hostMismatch && !tokens && (
          <p className="msg muted verbinding-result">
            Na het inloggen verandert het adres in je adresbalk van {hostMismatch.browserHost} naar{" "}
            {hostMismatch.redirectHost}. Dat hoort zo: Spotify accepteert alleen dat adres.
          </p>
        )}
      </section>

      <SyncButton
        card={{
          connected: !!tokens,
          snapshot: enriched
            ? { playlistCount: enriched.playlists.length, trackCount: totalTracks, syncedAt: enriched.syncedAt }
            : null,
        }}
      />
    </div>
  );
}
