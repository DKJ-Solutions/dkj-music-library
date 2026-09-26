// @vitest-environment jsdom
// PlaylistNameBulkButton.tsx: de knop die tientallen playlists in Dave's echte Spotify-account hernoemt.
// Precies daarom staat hier meer dan een render-test: getoetst worden de drie eigenschappen die bij deze
// omvang het verschil maken tussen bruikbaar en gevaarlijk --
//   1. het AANTAL staat in het label (je weet vooraf hoe groot de actie is);
//   2. hij gaat DOOR bij een fout en bewaart de reden van de eerste (een half uur diagnose bij de mix-tags
//      is de aanleiding, zie het dossier §6 punt 7);
//   3. hij SCHRIJFT SEQUENTIEEL (parallel loopt tegen Spotify's rate limit aan).
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlaylistNameBulkButton } from "./PlaylistNameBulkButton";

const DRIE = [
  { playlistId: "p1", target: "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1" },
  { playlistId: "p2", target: "EDM 176BPM 🟣 Purple Light (f) 🟣 Vol. 9" },
  { playlistId: "p3", target: "EDM 128BPM 🟢 Green Light (f) 🟢 Vol. 3" },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

const knop = () => screen.getByRole("button");

// Expliciete fetch-signatuur voor de mocks hieronder: zonder deze typering leidt TypeScript de
// call-tuple van een impl zonder parameters af als lengte 0, en is elke lezing van mock.calls[n]
// een typefout in plaats van een echte [url, init]-tuple.
type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Partial<Response>>;

describe("PlaylistNameBulkButton -- wat hij toont", () => {
  it("rendert niets als er niets te doen en niets geblokkeerd is", () => {
    const { container } = render(<PlaylistNameBulkButton teDoen={[]} blockedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("noemt het aantal in het label -- dit is een actie op meerdere playlists", () => {
    render(<PlaylistNameBulkButton teDoen={DRIE} blockedCount={0} />);
    expect(knop().textContent).toContain("3");
  });

  // De zes Cyan-playlists blijven erbuiten omdat de BRON eerst moet worden rechtgezet (Dave, 2026-08-11).
  // Ze stil laten vallen zou een knop opleveren die belooft "alle namen" te doen en er zes overslaat.
  it("meldt hoeveel playlists erbuiten blijven, en waarom je moet kijken", () => {
    render(<PlaylistNameBulkButton teDoen={DRIE} blockedCount={6} />);
    expect(screen.getByText(/6 playlists blijft hierbuiten/i)).toBeInTheDocument();
  });

  it("meldt de geblokkeerde playlists ook als er verder niets te doen is", () => {
    render(<PlaylistNameBulkButton teDoen={[]} blockedCount={6} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/6 playlists blijft hierbuiten/i)).toBeInTheDocument();
  });
});

describe("PlaylistNameBulkButton -- het schrijven", () => {
  it("schrijft één verzoek per playlist, met alleen het playlist-id", async () => {
    const spy = vi.fn<FetchMock>(async () => ({ ok: true }) as Partial<Response>);
    vi.stubGlobal("fetch", spy);
    const onDone = vi.fn();
    render(<PlaylistNameBulkButton teDoen={DRIE} blockedCount={0} onDone={onDone} />);

    fireEvent.click(knop());

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));
    expect(spy.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string))).toEqual([
      { playlistId: "p1" },
      { playlistId: "p2" },
      { playlistId: "p3" },
    ]);
    // Elke geslaagde hernoeming wordt gemeld, zodat de tabel de nieuwe namen toont zonder nieuwe sync.
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(3));
    expect(onDone).toHaveBeenCalledWith("p2", DRIE[1].target);
  });

  // SEQUENTIEEL, niet parallel: tientallen gelijktijdige schrijfacties lopen tegen de rate limit en moeten
  // dan elk hun eigen 429-wachttijd uitzitten. Getoetst door de eerste te laten hangen: staat de tweede
  // dan al open, dan is de lus parallel.
  it("wacht op elk verzoek voordat het volgende gaat", async () => {
    const openen: Array<() => void> = [];
    const spy = vi.fn(
      () =>
        new Promise<Partial<Response>>((resolve) => {
          openen.push(() => resolve({ ok: true }));
        })
    );
    vi.stubGlobal("fetch", spy);
    render(<PlaylistNameBulkButton teDoen={DRIE} blockedCount={0} />);

    fireEvent.click(knop());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    // Nog niets afgerond, en tóch maar één verzoek de deur uit.
    expect(spy).toHaveBeenCalledTimes(1);
    openen[0]();
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    openen[1]();
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));
    openen[2]();
  });

  it("gaat door na een fout en houdt de reden van de eerste mislukking vast", async () => {
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        n++;
        if (n === 1) {
          return {
            ok: false,
            status: 502,
            json: async () => ({ message: "Spotify weigert de wijziging (403): user not registered." }),
          } as Partial<Response>;
        }
        return { ok: true } as Partial<Response>;
      })
    );
    render(<PlaylistNameBulkButton teDoen={DRIE} blockedCount={0} />);

    fireEvent.click(knop());

    // Niet gestopt bij de eerste fout: de andere twee zijn wél hernoemd.
    await waitFor(() => expect(screen.getByText(/2 playlists hernoemd/i)).toBeInTheDocument());
    expect(screen.getByText(/1 mislukt/i)).toBeInTheDocument();
    expect(screen.getByText(/user not registered/i)).toBeInTheDocument();
  });

  it("laat de uitslag staan als de lijst daarna leeg is -- anders verdwijnt de melding precies wanneer je hem leest", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true }) as Partial<Response>));
    const { rerender } = render(<PlaylistNameBulkButton teDoen={DRIE} blockedCount={0} />);

    fireEvent.click(knop());
    await waitFor(() => expect(screen.getByText(/3 playlists hernoemd/i)).toBeInTheDocument());

    // De ouder haalt de rijen uit de werkvoorraad zodra ze gelukt zijn -- de uitslag hoort te blijven.
    rerender(<PlaylistNameBulkButton teDoen={[]} blockedCount={0} />);
    expect(screen.getByText(/3 playlists hernoemd/i)).toBeInTheDocument();
  });
});
