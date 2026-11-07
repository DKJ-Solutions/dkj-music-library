"use client";

// De card Voorstellen op /compare/pc-spotify (#151): per track zonder bestand het lokale bestand dat er het
// meest op lijkt (compareLocal.ts), met een veld om het te bevestigen of te verbeteren. Daaronder zelf een
// track aan een bestand koppelen, en de eigen koppelingen weer losmaken. Elke actie schrijft
// `dkj_local_file` via POST /api/local/link en laadt de pagina dan opnieuw.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkSuggestion, OwnLink, Unlinked } from "@/lib/local/compareLocal";
import { saveLocalLink } from "@/lib/local/saveLocalLink";

const FILES_LIST = "pc-link-files";
const TRACKS_LIST = "pc-link-tracks";

export function PcSpotifyLinks({
  suggestions,
  ownLinks,
  unlinked,
  filePaths,
}: {
  suggestions: readonly LinkSuggestion[];
  ownLinks: readonly OwnLink[];
  unlinked: readonly Unlinked[];
  /** De paden die je kunt kiezen: alleen lokaal plus de voorgestelde. */
  filePaths: readonly string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link(trackId: string, localFile: string | null) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveLocalLink(trackId, localFile);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function onSuggestion(event: React.FormEvent<HTMLFormElement>, trackId: string) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("file");
    if (typeof value === "string" && value.trim() !== "") void link(trackId, value);
  }

  function onOwn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get("track");
    const file = data.get("file");
    const track = unlinked.find((t) => t.file === name);
    if (!track) {
      setError("Kies een track uit de lijst te downloaden.");
      return;
    }
    if (typeof file === "string" && file.trim() !== "") void link(track.trackId, file);
  }

  return (
    <>
      <datalist id={FILES_LIST}>
        {filePaths.map((path) => (
          <option key={path} value={path} />
        ))}
      </datalist>
      <datalist id={TRACKS_LIST}>
        {unlinked.map((track) => (
          <option key={track.trackId} value={track.file} />
        ))}
      </datalist>

      {error && <p className="pc-link-error">{error}</p>}

      {suggestions.length === 0 ? (
        <p className="empty-note">Geen bestand dat op een ontbrekende track lijkt.</p>
      ) : (
        <ul className="pc-list">
          {suggestions.map((s) => (
            <li key={s.trackId} className="pc-link">
              <span className="pc-link-track" title={`${Math.round(s.score * 100)}% overeenkomst`}>
                {s.file}
              </span>
              <form className="pc-link-form" onSubmit={(event) => onSuggestion(event, s.trackId)}>
                <input
                  name="file"
                  list={FILES_LIST}
                  defaultValue={s.suggestion.relativePath}
                  aria-label={`Bestand voor ${s.file}`}
                />
                <button type="submit" className="btn" disabled={busy}>
                  Koppel
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <details className="pc-playlist">
        <summary>Zelf koppelen</summary>
        <form className="pc-link-form" onSubmit={onOwn}>
          <input name="track" list={TRACKS_LIST} placeholder="Track" aria-label="Track" />
          <input name="file" list={FILES_LIST} placeholder="Bestand" aria-label="Bestand" />
          <button type="submit" className="btn" disabled={busy}>
            Koppel
          </button>
        </form>
      </details>

      {ownLinks.length > 0 && (
        <details className="pc-playlist">
          <summary>
            Zelf gekoppeld <span className="pc-count">{ownLinks.length}</span>
          </summary>
          <ul className="pc-list">
            {ownLinks.map((own) => (
              <li key={own.trackId} className="pc-link">
                <span className="pc-link-track" title={own.relativePath}>
                  {own.file ?? own.trackId}
                </span>
                <button type="button" className="btn" disabled={busy} onClick={() => void link(own.trackId, null)}>
                  Ontkoppel
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
