// Een track van de ene werkbak naar een andere verplaatsen vanuit de tabel van een werkbak: POST
// /api/spotify/playlist-move (zie die route voor wat de server doet, #134). Gooit met de uitleg uit het
// antwoord van de route als het mislukt, zodat de tabel die kan tonen.
//
// Pure module (op fetch na): geen fs, geen React -- vanuit een 'use client'-bestand te gebruiken.
import { readRouteErrorMessage } from "@/lib/http/routeError";

export async function moveTrackToPlaylist(
  fromId: string,
  toId: string,
  trackId: string
): Promise<{ added: boolean; refreshed: boolean }> {
  const res = await fetch("/api/spotify/playlist-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromId, toId, trackId }),
  });
  if (!res.ok) throw new Error((await readRouteErrorMessage(res)) ?? `status ${res.status}`);
  const data = (await res.json()) as { added?: unknown; refreshed?: unknown };
  return { added: data.added === true, refreshed: data.refreshed === true };
}
