// Wanneer Spotify de hub weer laat schrijven (en lezen): het eindtijdstip van een lange rate limit, lokaal
// bewaard in data/spotify/rate-limit.json (Dave, 31 oktober 2026). Spotify legt na veel verkeer een
// APP-BREDE straf op van uren; herhaalde pogingen gaven afnemende Retry-After-waarden die allemaal op
// hetzelfde moment eindigen, dus het einde staat vast. httpClient.ts schrijft het hier weg zodra hij een
// SpotifyRateLimitError gooit; de routes lezen het om Spotify niet nodeloos aan te roepen en om te tonen
// vanaf wanneer een uitgestelde volgorde (pendingOrderStore.ts) verstuurd kan worden.
//
// App-breed, niet per playlist. SERVER-ONLY: gebruikt Node's `fs`.
import fs from "fs";
import path from "path";

const DEFAULT_PATH = path.join(process.cwd(), "data", "spotify", "rate-limit.json");

function storePath(): string {
  const override = process.env.SPOTIFY_RATE_LIMIT_STORE_PATH;
  return override ? path.resolve(override) : DEFAULT_PATH;
}

/** Legt vast dat Spotify nu `retryAfterSeconds` lang niet bereikbaar is. De laatste uitspraak van Spotify wint:
 *  die is de actueelste, ook als hij korter is dan een eerdere. */
export function recordRateLimit(retryAfterSeconds: number, now: number = Date.now()): number {
  const until = now + retryAfterSeconds * 1000;
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ until, recordedAt: new Date(now).toISOString() }, null, 2), "utf8");
  return until;
}

/** Het eindtijdstip (ms sinds epoch) van de rate limit, of null als er geen is of hij voorbij is. Een
 *  onleesbaar bestand telt als "geen rate limit": liever een poging te veel dan een app die op slot zit. */
export function getRateLimitUntil(now: number = Date.now()): number | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8")) as { until?: unknown };
    return typeof parsed.until === "number" && Number.isFinite(parsed.until) && parsed.until > now ? parsed.until : null;
  } catch {
    return null;
  }
}
