// @vitest-environment jsdom
// SpotifyIdWriteButton.tsx: de twee knoppen die id_spotify in de playlistbeschrijving zetten. Getoetst
// wordt vooral het contract met de route -- deze knoppen wijzigen Dave's echte Spotify-account, en ze
// mogen niets anders versturen dan een playlist-id plus het mix-ID waar de server de rest uit opbouwt.
//
// Voor de bulk-knop is de kern dat hij SEQUENTIEEL werkt en DOORGAAT bij een fout: dat zijn de twee
// lessen uit de eerdere bulk-acties, en ze zijn alleen hier af te dwingen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpotifyIdBulkButton, SpotifyIdWriteButton } from "./SpotifyIdWriteButton";

const PROPS = {
  playlistId: "37i9dQZF1DX0XUsuxWHRQd",
  playlistName: "EDM 128BPM 🔴 Red Light (m) 🔴 Vol. 6",
  mixId: "20260615",
  targetKey: "mmc_edm_128bpm_light_m_red_20260615",
};

function mockFetch(impl: () => Promise<Partial<Response>>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SpotifyIdWriteButton", () => {
  it("noemt de doelsleutel in de tooltip, zodat de knop verklapt wat hij gaat schrijven", () => {
    render(<SpotifyIdWriteButton {...PROPS} />);
    const knop = screen.getByRole("button");
    expect(knop.getAttribute("title")).toContain(PROPS.targetKey);
    expect(knop.getAttribute("title")).toContain(PROPS.playlistName);
  });

  it("stuurt precies het playlist-id en het mix-ID naar de tag-route, en geen tekst", async () => {
    // De grens van de route: de beschrijving wordt server-side uit de mix-bron opgebouwd. Zou de client
    // hier tekst meesturen, dan was er een weg om willekeurige inhoud in een playlist te krijgen.
    const fetchSpy = mockFetch(async () => ({ ok: true }));
    render(<SpotifyIdWriteButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/spotify/mix-tag");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      playlistId: PROPS.playlistId,
      mixId: PROPS.mixId,
    });
  });

  it("meldt na succes dat er geschreven is en biedt geen tweede klik meer aan", async () => {
    mockFetch(async () => ({ ok: true }));
    render(<SpotifyIdWriteButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
    expect(screen.getByText("geschreven")).toBeInTheDocument();
  });

  it("laat de knop staan als de route weigert, met de reden in de tooltip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "spotify_error",
              message: "Spotify weigert de wijziging (403): The user is not registered for this application.",
            }),
            { status: 502 }
          )
      )
    );
    render(<SpotifyIdWriteButton {...PROPS} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button").textContent).toContain("mislukt"));
    expect(screen.getByRole("button").getAttribute("title")).toContain("not registered");
  });
});

describe("SpotifyIdBulkButton", () => {
  const RIJEN = [
    { playlistId: "een", mixId: "20260615" },
    { playlistId: "twee", mixId: "20251108" },
    { playlistId: "drie", mixId: "20240408" },
  ];

  it("toont niets als er niets te doen en niets geblokkeerd is", () => {
    const { container } = render(<SpotifyIdBulkButton teDoen={[]} blockedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("noemt het aantal in het label -- de knop wijzigt meerdere playlists tegelijk", () => {
    render(<SpotifyIdBulkButton teDoen={RIJEN} blockedCount={0} />);
    expect(screen.getByRole("button").textContent).toContain("3 playlistbeschrijvingen");
  });

  it("schrijft SEQUENTIEEL: nooit meer dan één aanroep tegelijk onderweg", async () => {
    // Parallel lopen tientallen schrijfacties tegen de rate limit aan, waarna elke aanroep zijn eigen
    // 429-wachttijd moet uitzitten -- langzamer én onnetter.
    let onderweg = 0;
    let maxOnderweg = 0;
    const fetchSpy = mockFetch(async () => {
      onderweg++;
      maxOnderweg = Math.max(maxOnderweg, onderweg);
      await Promise.resolve();
      onderweg--;
      return { ok: true };
    });

    render(<SpotifyIdBulkButton teDoen={RIJEN} blockedCount={0} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    expect(maxOnderweg).toBe(1);
  });

  it("gaat door na een mislukking en bewaart de reden van de EERSTE", async () => {
    // Eén playlist die weigert hoort de andere twee niet te blokkeren. En bij een gemeenschappelijke
    // oorzaak staat die in elk antwoord -- alleen een getal tonen gooit precies die informatie weg.
    let n = 0;
    mockFetch(async () => {
      n++;
      if (n === 1) return new Response(JSON.stringify({ message: "eerste reden" }), { status: 502 });
      if (n === 2) return new Response(JSON.stringify({ message: "tweede reden" }), { status: 502 });
      return { ok: true };
    });

    render(<SpotifyIdBulkButton teDoen={RIJEN} blockedCount={0} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByText(/2 mislukt/)).toBeInTheDocument());
    expect(screen.getByText(/eerste reden/)).toBeInTheDocument();
    expect(screen.queryByText(/tweede reden/)).toBeNull();
  });

  it("meldt de geblokkeerde rijen apart in plaats van ze stil te laten vallen", () => {
    render(<SpotifyIdBulkButton teDoen={[]} blockedCount={2} />);
    expect(screen.getByText(/2 playlists blijft hierbuiten/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
