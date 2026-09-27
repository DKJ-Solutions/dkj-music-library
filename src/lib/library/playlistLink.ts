// Een playlist in `dkj_playlists`, en de link ernaar. Apart van playlistLinks.ts, dat de database
// gebruikt: dit deel moet ook in de browser kunnen (TrackRegister.tsx).
//
// Pure module: geen fs, geen sqlite.

export interface PlaylistLink {
  id: string;
  name: string;
}

/** De link naar een playlist op Spotify. */
export function playlistUrl(id: string): string {
  return `https://open.spotify.com/playlist/${encodeURIComponent(id)}`;
}
