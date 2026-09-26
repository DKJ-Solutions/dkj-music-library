// De val die de schrijfkant van de `mix:`-tag één poging kostte (Dave, 2026-07-25), hier voorgoed
// dichtgezet.
//
// WAT ER GEBEURDE: de login gaf *"De login-poging kon niet worden geverifieerd (state komt niet
// overeen)"*. De oorzaak leek de nieuwe schrijf-scope, maar was het adres. De app was geopend op
// `http://localhost:3000`, dus zette de login-route zijn CSRF-state-cookie op host `localhost`. De
// redirect-URI móet echter op `127.0.0.1` staan -- Spotify weigert `localhost` sinds 2025 (zie het
// dossier, §1/§6) -- dus kwam de callback binnen op `127.0.0.1`. Voor een browser zijn dat twee
// verschillende hosts: de cookie gaat niet mee, `expectedState` is leeg, en de callback weigert
// terecht in te wisselen. Niets kapot, alleen het verkeerde adres.
//
// DE PORT DOET HIER BEWUST NIET MEE. Cookies zijn host-gebonden zónder port: `localhost:3000` en
// `localhost:3001` delen hun cookies. Een afwijkende port kan dus nooit de oorzaak van dit
// state-probleem zijn, en meewegen zou alleen valse alarmen geven.
//
// Pure module: geen fs, geen React, geen env-toegang -- de aanroeper levert beide kanten aan. Zo is
// hij te testen zonder een request of een omgeving na te bouwen.

/** Een aangetroffen verschil tussen de host waarop de app geopend is en de host waarop de
 *  OAuth-callback zal binnenkomen. */
export interface RedirectHostMismatch {
  /** De hostnaam waarop de app nú geopend is, bv. `localhost`. */
  browserHost: string;
  /** De hostnaam die de redirect-URI voorschrijft, bv. `127.0.0.1`. */
  redirectHost: string;
  /** Het adres waarop de app geopend hoort te worden: de origin van de redirect-URI met het huidige
   *  pad erachter. Altijd afgeleid van de redirect-URI (server-side config), nooit van de
   *  `Host`-header -- een meegestuurde header mag nooit bepalen waar de app naartoe wijst. */
  correctUrl: string;
}

/** Parseert een `Host`-header (`hostnaam` of `hostnaam:port`) naar een URL, of `null` als dat niet
 *  lukt. De omweg via `URL` scheidt de port van de hostnaam (ook bij IPv6, waar `[::1]:3000` de
 *  hostnaam `[::1]` mét haakjes oplevert -- dezelfde vorm als aan de redirect-URI-kant, dus de twee
 *  blijven vergelijkbaar) en garandeert dat we verderop met een geparseerde hostnaam werken in plaats
 *  van met rauwe header-tekst. */
function parseHostHeader(host: string | null | undefined): URL | null {
  if (!host) return null;
  try {
    return new URL(`http://${host}`);
  } catch {
    return null;
  }
}

function parseUri(uri: string | null | undefined): URL | null {
  if (!uri) return null;
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

/** Vergelijkt de host waarop de app geopend is met de host uit de redirect-URI.
 *
 *  Levert `null` zodra er niets te melden is: gelijke hostnamen, of een van de twee waarden die niet
 *  te parseren is. Bij twijfel dus zwijgen -- een waarschuwing die soms onterecht verschijnt wordt
 *  genegeerd, en dan is deze check zijn nut kwijt.
 *
 *  @param browserHost  De `Host`-header van het huidige request (`headers().get("host")`).
 *  @param redirectUri  De geconfigureerde OAuth-redirect-URI (zie config.ts).
 *  @param currentPath  Het pad waarop de gebruiker nu staat, om in `correctUrl` terug te geven. */
export function findRedirectHostMismatch(
  browserHost: string | null | undefined,
  redirectUri: string | null | undefined,
  currentPath: string = "/"
): RedirectHostMismatch | null {
  const browser = parseHostHeader(browserHost);
  const redirect = parseUri(redirectUri);
  if (browser === null || redirect === null) return null;

  // Hostnaam-vergelijking, niet host: zie de port-toelichting bovenaan. Case-insensitive omdat DNS
  // dat ook is -- `LOCALHOST` en `localhost` zijn dezelfde host en dus geen afwijking.
  if (browser.hostname.toLowerCase() === redirect.hostname.toLowerCase()) return null;

  const path = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;
  return {
    browserHost: browser.hostname,
    redirectHost: redirect.hostname,
    correctUrl: `${redirect.origin}${path}`,
  };
}
