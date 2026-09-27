// `dkj_bpm` UIT DE PLAYLISTS: welke BPM-groep een track heeft, afgeleid uit de namen van de
// Spotify-playlists waarin hij staat (spotify_playlist).
//
// Per playlist, in deze volgorde:
//   1. De vaste regels van de MMC-wereld (classifyMmcBpm in classifyBpm.ts): House Mix is 128, Drum &
//      Bass (Mix) is 176, plus de twee playlists met een eigen vaste BPM.
//   2. Een BPM in de naam zelf ("Magenta Light (m) ♦️ 128BPM EDM"), als dat een van de opties van
//      dkj_bpm is (ook 144, dat de MMC-wereld niet kent).
//   3. D&B of DNB in de naam ("D&B", "Green Light (f) | DNB | Bruiloft") is 176, net als de Drum &
//      Bass-reeks in regel 1.
//
// Per track (Dave, 27 september 2026: "zoveel mogelijk"): de BPM die de meeste van zijn playlists
// noemen. Bij een gelijke stand blijft het leeg en kies je zelf. Gemeten op 12.471 tracks: 6.968
// eenduidig, 33 met verschillende BPM's, en 469 extra door regel 3.
//
// Pure module: geen fs, geen sqlite.
import { classifyMmcBpm } from "@/lib/spotify/classifyBpm";
import { parsePlaylistName } from "@/lib/spotify/parsePlaylistName";
import { TRACK_FIELDS } from "./fields";

const BPM_OPTIONS: readonly string[] = TRACK_FIELDS.find((field) => field.key === "dkj_bpm")?.options ?? [];

const DRUM_AND_BASS = /(?:^|[^\p{L}])(?:d&b|dnb|d ?n ?b|drum\s*(?:&|and|n)\s*bass)(?:[^\p{L}]|$)/iu;

/** De BPM-groep die een playlistnaam noemt ("128BPM"), of null. */
export function bpmOfPlaylist(name: string): string | null {
  const parsed = parsePlaylistName(name);
  const candidates = [classifyMmcBpm({ name, parsed }), parsed.bpm, DRUM_AND_BASS.test(name) ? 176 : null];
  for (const bpm of candidates) {
    if (bpm !== null && BPM_OPTIONS.includes(`${bpm}BPM`)) return `${bpm}BPM`;
  }
  return null;
}

/** De BPM-groep van een track: die de meeste van zijn playlists noemen, of null bij geen of een gelijke
 *  stand. */
export function bpmFromPlaylists(playlistNames: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const name of playlistNames) {
    const bpm = bpmOfPlaylist(name);
    if (bpm !== null) counts.set(bpm, (counts.get(bpm) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || (ranked.length > 1 && ranked[0][1] === ranked[1][1])) return null;
  return ranked[0][0];
}
