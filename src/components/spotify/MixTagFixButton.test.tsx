// @vitest-environment jsdom
// MixTagFixButton.tsx: de correctie van een verweesde `mix:`-tag op de brug. Getoetst wordt vooral het
// contract met de route -- dit is de enige plek op de brug die iets in Dave's Spotify-account wijzigt, en
// hij mag uitsluitend het ID versturen waar de tracks naar wijzen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MixTagFixButton } from "./MixTagFixButton";

const PROPS = {
  playlistId: "37i9dQZF1DX0XUsuxWHRQd",
  playlistName: "House Mix 🔴 Red Light (m) 🔴 Vol. 6",
  wrongMixId: "19990101",
  correctMixId: "20260615",
};

function mockFetch(impl: () => Promise<Partial<Response>>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const knop = () => screen.getByRole("button");

describe("MixTagFixButton", () => {
  it("noemt het doel-ID in het label, zodat de knop verklapt wat hij gaat schrijven", () => {
    render(<MixTagFixButton {...PROPS} />);
    expect(knop().textContent).toContain("20260615");
    expect(knop().getAttribute("title")).toContain("mix:19990101");
    expect(knop().getAttribute("title")).toContain("mix:20260615");
  });

  it("stuurt precies het playlist-id en het correcte mix-ID naar de tag-route", async () => {
    const fetchSpy = mockFetch(async () => ({ ok: true }));
    render(<MixTagFixButton {...PROPS} />);
    fireEvent.click(knop());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/spotify/mix-tag");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      playlistId: PROPS.playlistId,
      mixId: "20260615",
    });
  });

  it("meldt na succes wat er geschreven is en biedt geen tweede klik meer aan", async () => {
    mockFetch(async () => ({ ok: true }));
    render(<MixTagFixButton {...PROPS} />);
    fireEvent.click(knop());

    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
    expect(screen.getByText("→ mix:20260615 gezet")).toBeInTheDocument();
  });

  it("laat de knop staan als de route weigert, zodat de poging te herhalen is", async () => {
    const fetchSpy = mockFetch(async () => ({ ok: false, status: 403 }));
    render(<MixTagFixButton {...PROPS} />);
    fireEvent.click(knop());

    await waitFor(() => expect(knop().textContent).toContain("mislukt"));
    fireEvent.click(knop());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });

  // "mislukt" zonder meer laat je raden; de tooltip heeft ruimte voor Spotify's eigen woorden, die de
  // route doorgeeft (Dave, 2026-07-25).
  it("zet de reden van de route in de tooltip bij een mislukking", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "spotify_error",
            status: 403,
            message:
              "Spotify weigert de wijziging (403): The user is not registered for this application.",
          }),
          { status: 502 }
        )
      )
    );
    render(<MixTagFixButton {...PROPS} />);
    fireEvent.click(knop());

    await waitFor(() => expect(knop().textContent).toContain("mislukt"));
    expect(knop().getAttribute("title")).toContain("not registered for this application");
  });

  it("negeert een tweede klik terwijl de eerste nog loopt -- geen dubbele schrijfactie", async () => {
    let los: (() => void) | null = null;
    const fetchSpy = mockFetch(
      () => new Promise<Partial<Response>>((resolve) => (los = () => resolve({ ok: true })))
    );
    render(<MixTagFixButton {...PROPS} />);

    fireEvent.click(knop());
    await waitFor(() => expect(knop()).toBeDisabled());
    fireEvent.click(knop());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    los!();
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });
});
