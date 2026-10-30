// De sectie Connection op /spotify (Dave, #122): een h2 met twee kaarten eronder. Login regelt het inloggen
// -- de status, de knop, een login-fout en de host-melding --, Sync de volledige sync (SyncButton.tsx).
// Server Component: leest de tokens en de verrijkte snapshot van schijf (Node's `fs`). De OAuth-callback en
// het loskoppelen komen terug op /spotify (api/auth/callback/spotify, api/auth/logout/spotify), met
// ?connected=1 of ?error=<code> -- die query geeft de pagina hier door.
import { headers } from "next/headers";
import { readTokens } from "@/lib/spotify/tokenStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { findSpotifyConfigProblem, getSpotifyRedirectUri } from "@/lib/spotify/config";
import { findRedirectHostMismatch } from "@/lib/spotify/redirectHost";
import SyncButton from "@/components/spotify/SyncButton";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "De login-poging kon niet worden geverifieerd (state komt niet overeen). Probeer opnieuw.",
  token_exchange_failed: "Het inwisselen van de code voor tokens is mislukt. Zie de serverconsole (het venster waarin `npm run dev` draait) voor details.",
  // Alleen te zien als de configuratie intussen wél klopt: anders staat de melding zelf al op de kaart.
  config_missing: "De Spotify-configuratie ontbrak bij het inloggen. Ze is er nu wel; probeer opnieuw.",
};

export default async function ConnectionCards({ params }: { params: { connected?: string; error?: string } }) {
  const hostMismatch = findRedirectHostMismatch(
    (await headers()).get("host"),
    getSpotifyRedirectUri(),
    "/spotify"
  );
  const tokens = readTokens();
  const enriched = getEnrichedSnapshot();
  // Ontbreken de sleutels, dan staat de melding op de kaart in plaats van de inlogknop (#123). De
  // ?error=config_missing van de login-route voegt dan niets toe en wordt niet nog eens getoond.
  const configProblem = findSpotifyConfigProblem();
  // Sinds de login-route zichzelf op de juiste host zet (api/auth/login/spotify) hóórt een
  // state_mismatch hier niet meer door het adres te komen. Komt hij tóch voor terwijl de hosts
  // uiteenlopen, dan is dat waardevolle informatie -- dan heeft de hop niet gedaan wat hij moest doen --
  // dus blijft de melding die oorzaak noemen, nu als "onverwacht" in plaats van als instructie.
  const errorMessage = params.error && !(params.error === "config_missing" && configProblem)
    ? params.error === "state_mismatch" && hostMismatch
      ? `De login-poging kon niet worden geverifieerd (state komt niet overeen), terwijl je de app op ${hostMismatch.browserHost} hebt geopend en de callback op ${hostMismatch.redirectHost} binnenkomt. Dat zou de login-route zelf moeten hebben rechtgezet, dus dit is onverwacht. Open de app op ${hostMismatch.correctUrl} en probeer het daar.`
      : (ERROR_MESSAGES[params.error] ?? `Onbekende fout: ${params.error}`)
    : null;

  return (
    // Twee kaarten, Login en Sync (Dave, #122). Wat de laatste sync opleverde staat als subregel onder de
    // kop Playlists op /spotify.
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
                : configProblem
                  ? "Inloggen kan nog niet: de Spotify-sleutels ontbreken."
                  : "Nog niet ingelogd. Log eerst in bij Spotify."}
            </p>
          </div>
          {tokens ? (
            <form action="/api/auth/logout/spotify" method="POST">
              <button type="submit" className="btn">
                Loskoppelen
              </button>
            </form>
          ) : configProblem ? null : (
            <a className="btn btn--primary" href="/api/auth/login/spotify">
              Inloggen bij Spotify
            </a>
          )}
        </div>

        {configProblem && <p className="msg msg--warn verbinding-result">{configProblem}</p>}
        {errorMessage &&<p className="msg msg--warn verbinding-result">{errorMessage}</p>}
      </section>

      <SyncButton card={{ connected: !!tokens, hasSnapshot: !!enriched }} />
    </div>
  );
}
