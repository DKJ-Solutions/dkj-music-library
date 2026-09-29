// De waardering van één track opslaan vanuit het trackregister: POST /api/spotify/rating (zie rating.ts
// voor wat de server doet). Gooit met de uitleg uit het antwoord van de route als het mislukt, zodat de
// cel die kan tonen in plaats van een vaste tekst.
//
// Pure module (op fetch na): geen fs, geen React -- vanuit een 'use client'-bestand te gebruiken.
import { readRouteErrorMessage } from "@/lib/http/routeError";

export async function saveRating(trackId: string, rating: string): Promise<void> {
  const res = await fetch("/api/spotify/rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, rating }),
  });
  if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
}
