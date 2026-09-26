// @vitest-environment jsdom
// PlaylistNameSyncButton.tsx: het hernoem-knopje in de naam-cel van de playlist-tabel. Getoetst wordt
// vooral het CONTRACT met de route -- dit is, naast de mix-tag, de tweede plek die iets in Dave's echte
// Spotify-account wijzigt, en hij mag niets anders versturen dan een playlist-id. De naam komt server-side
// uit de mix-bron; kon de client hem meesturen, dan zou de afspraak "de bron dicteert de naam" een belofte
// zijn in plaats van een grens.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlaylistNameSyncButton } from "./PlaylistNameSyncButton";

const PROPS = {
  playlistId: "37i9dQZF1DX0XUsuxWHRQd",
  playlistName: "House Mix 🟡 Yellow Full (m) 🟡 Vol. 1",
  state: "outdated" as const,
  target: "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1",
  blocker: null,
};

// Expliciete fetch-signatuur: zonder deze typering leidt TypeScript de call-tuple van een impl
// zonder parameters af als lengte 0, en is elke lezing van mock.calls[0] een typefout in plaats
// van een echte [url, init]-tuple.
type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Partial<Response>>;

function mockFetch(impl: FetchMock) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlaylistNameSyncButton -- wanneer hij verschijnt", () => {
  it("rendert niets als de naam al klopt", () => {
    const { container } = render(<PlaylistNameSyncButton {...PROPS} state="in-sync" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rendert een knop zodra de naam afwijkt", () => {
    render(<PlaylistNameSyncButton {...PROPS} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  // BLOKKADE = MELDING, GEEN KNOP. Nu zijn dat de zes Cyan-playlists: de bron schrijft 💠 waar Dave's
  // playlists 🧊 gebruiken, en die fout wordt in de BRON rechtgezet (Dave, 2026-08-11). Een knop aanbieden
  // die de verkeerde emoji schrijft zou precies het tegenovergestelde doen van die beslissing.
  it("toont bij een blokkade een merkteken met de reden, en géén knop", () => {
    render(
      <PlaylistNameSyncButton
        {...PROPS}
        state="blocked"
        blocker="De naam draagt 💠 als kleur-emoji, maar Cyan is 🧊 in deze app."
      />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByTitle(/💠/)).toBeInTheDocument();
  });
});

describe("PlaylistNameSyncButton -- het contract met de route", () => {
  it("stuurt UITSLUITEND het playlist-id -- de naam komt uit de bron, niet van de client", async () => {
    const fetchSpy = mockFetch(async () => ({ ok: true }));
    render(<PlaylistNameSyncButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/spotify/playlist-name");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ playlistId: PROPS.playlistId });
  });

  it("noemt de oude én de nieuwe naam in de tooltip, zodat de knop verklapt wat hij gaat doen", () => {
    render(<PlaylistNameSyncButton {...PROPS} />);
    const titel = screen.getByRole("button").getAttribute("title") ?? "";
    expect(titel).toContain(PROPS.playlistName);
    expect(titel).toContain(PROPS.target);
  });

  it("meldt de nieuwe naam aan de tabel en verdwijnt daarna", async () => {
    mockFetch(async () => ({ ok: true }));
    const onDone = vi.fn();
    const { container } = render(<PlaylistNameSyncButton {...PROPS} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(PROPS.playlistId, PROPS.target));
    // De rij toont vanaf nu de nieuwe naam; een knop die aanbiedt hetzelfde nog eens te doen hoort weg.
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  // De reden van een mislukking is het enige waarmee je verder komt -- bij de mix-tags kostte het weggooien
  // ervan een half uur diagnose (zie het dossier, §6 punt 7). Dus: de melding van de route in de tooltip,
  // en géén onDone, want er is niets veranderd.
  it("houdt de knop staan bij een fout, met de reden van de route in de tooltip", async () => {
    mockFetch(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ message: "Spotify weigert de wijziging (403): niet jouw playlist." }),
    }));
    const onDone = vi.fn();
    render(<PlaylistNameSyncButton {...PROPS} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByRole("button").getAttribute("title")).toContain("niet jouw playlist")
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it("klikt niet twee keer terwijl de eerste schrijfactie nog loopt", async () => {
    let laatHangen!: () => void;
    const fetchSpy = mockFetch(
      () => new Promise<Partial<Response>>((resolve) => (laatHangen = () => resolve({ ok: true })))
    );
    render(<PlaylistNameSyncButton {...PROPS} />);

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    fireEvent.click(screen.getByRole("button"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    laatHangen();
  });
});
