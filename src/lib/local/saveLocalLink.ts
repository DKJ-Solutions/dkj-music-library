// Een eigen koppeling opslaan of losmaken vanaf /compare/pc-spotify: POST /api/local/link (zie localLink.ts
// voor wat de server doet). Gooit met de uitleg uit het antwoord van de route als het mislukt.
//
// Pure module (op fetch na): geen fs, geen React -- vanuit een 'use client'-bestand te gebruiken.
import { readRouteErrorMessage } from "@/lib/http/routeError";

export async function saveLocalLink(trackId: string, localFile: string | null): Promise<void> {
  const res = await fetch("/api/local/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId, localFile }),
  });
  if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
}
