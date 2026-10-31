// @vitest-environment jsdom
// TrackRegister.tsx: de tabel van /spotify/trackregister. Het filter zelf is getest in register.test.ts,
// het bewaren van de filterstand in registerPrefs.test.ts; hier wat de component zelf beslist: bladeren
// per 100 rijen, dat een filter terugspringt naar pagina 1, en dat de bewaarde stand ook echt terugkomt.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrackRegister } from "./TrackRegister";
import { CANDIDATES_FILTER, type RegisterRow } from "@/lib/library/register";
import { REGISTER_PREFS_KEY } from "@/lib/library/registerPrefs";
import { loadSpotifyIframeApi } from "@/lib/library/trackEmbed";
import { PlaylistOrderError, savePlaylistOrder } from "@/lib/library/savePlaylistOrder";

// TrackRegister ververst de pagina na een verplaatsing; buiten de app-router bestaat er geen router.
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/library/savePlaylistOrder", async (original) => ({
  ...(await original<typeof import("@/lib/library/savePlaylistOrder")>()),
  savePlaylistOrder: vi.fn(),
}));

// De iFrame API van Spotify is een script van buiten; de tests geven de component een nep-API.
vi.mock("@/lib/library/trackEmbed", async (original) => ({
  ...(await original<typeof import("@/lib/library/trackEmbed")>()),
  loadSpotifyIframeApi: vi.fn(),
}));

// Elke test begint met een lege localStorage: anders leest de volgende test de bewaarde stand van de
// vorige terug, en cleanup() ontkoppelt de vorige render (zijn schrijf-effect mag niet meer vuren).
beforeEach(() => {
  window.localStorage.clear();
  refresh.mockClear();
  vi.mocked(savePlaylistOrder).mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function row(n: number, over: Partial<RegisterRow> = {}): RegisterRow {
  return {
    id: `ART01-${String(n).padStart(3, "0")}`,
    title: `Nummer ${n}`,
    artistIds: ["ART01"],
    artistNames: ["Artiest"],
    artist: "Artiest",
    albumArtist: "Artiest",
    year: null,
    bpm: null,
    genre: null,
    rating: null,
    mixRating: null,
    playcount: null,
    album: null,
    albumCandidates: [],
    file: `Artiest - Nummer ${n}`,
    dkjTitle: `Nummer ${n}`,
    groups: [],
    playlists: [],
    mixes: [],
    spotifyTrackId: `sp${n}`,
    ...over,
  };
}

const bodyRows = () => document.querySelectorAll(".register-table tbody tr");

describe("TrackRegister", () => {
  const rows = [
    ...Array.from({ length: 149 }, (_, i) => row(i + 1)),
    row(150, { bpm: "176BPM", album: "Blue Full (m)" }),
  ];

  it("nummert de rijen van de compacte tabel 1 tot en met n, ook na sorteren", () => {
    const three = [row(1, { mixRating: "tier-2" }), row(2, { mixRating: "tier-8" }), row(3, { mixRating: "tier-5" })];
    render(<TrackRegister rows={three} artistCount={1} compact />);
    const positions = () => Array.from(document.querySelectorAll(".register-position"), (cell) => cell.textContent);
    const titles = () => Array.from(document.querySelectorAll(".register-title"), (cell) => cell.textContent);
    expect(positions()).toEqual(["1", "2", "3"]);
    // Zonder playlistOrder (een mixpagina): de hoogste dkj_mix_rating eerst.
    expect(titles()).toEqual(["Nummer 2", "Nummer 3", "Nummer 1"]);
    fireEvent.click(screen.getByRole("button", { name: /dkj_title/ }));
    expect(positions()).toEqual(["1", "2", "3"]);
    expect(titles()).toEqual(["Nummer 1", "Nummer 2", "Nummer 3"]);
  });

  it("toont in de compacte tabel alleen dkj_mix_rating, en sorteert daarop", () => {
    const three = [row(1, { rating: "tier-8", mixRating: "tier-1" }), row(2, { rating: "tier-1", mixRating: "tier-7" })];
    render(<TrackRegister rows={three} artistCount={1} compact />);
    expect(screen.getByRole("columnheader", { name: /mix rating/ })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: /dkj_rating/ })).toBeNull();
    expect(screen.queryByText("tier-8", { selector: ".register-tag" })).toBeNull();
    const titles = () => Array.from(document.querySelectorAll(".register-title"), (cell) => cell.textContent);
    expect(titles()).toEqual(["Nummer 2", "Nummer 1"]);
  });

  describe("verslepen in de tabel van een playlist", () => {
    const three = [row(1), row(2), row(3)];
    // Plek 1 in de playlist is een item zonder bibliotheekrij (bv. een lokaal bestand).
    const order = { playlistId: "P".repeat(22), snapshotId: "snap1", positions: { [three[0].id]: 0, [three[1].id]: 2, [three[2].id]: 3 }, itemIds: ["sp1", null, "sp2", "sp3"] };
    const titles = () => Array.from(document.querySelectorAll(".register-title"), (cell) => cell.textContent);
    const grip = (n: number) => screen.getByRole("button", { name: new RegExp(`Nummer ${n} verplaatsen`) });

    it("opent in de volgorde van de playlist, ook als de mix rating anders zou sorteren", () => {
      const rated = [row(1, { mixRating: "tier-1" }), row(2, { mixRating: "tier-8" })];
      render(<TrackRegister rows={rated} artistCount={1} compact playlistOrder={{ ...order, positions: { [rated[0].id]: 0, [rated[1].id]: 1 } }} />);
      expect(titles()).toEqual(["Nummer 1", "Nummer 2"]);
    });

    it("heeft geen sleepgrepen zonder playlistOrder", () => {
      render(<TrackRegister rows={three} artistCount={1} compact />);
      expect(document.querySelector(".register-grip")).toBeNull();
    });

    it("verplaatst met de pijltoets, optimistisch, met de plekken van de playlist, en ververst daarna", async () => {
      vi.mocked(savePlaylistOrder).mockResolvedValue({ refreshed: true, pending: false, rateLimitedUntil: null });
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={order} />);
      fireEvent.keyDown(grip(1), { key: "ArrowDown" });
      expect(titles()).toEqual(["Nummer 2", "Nummer 1", "Nummer 3"]);
      expect(savePlaylistOrder).toHaveBeenCalledWith(order.playlistId, "snap1", {
        rangeStart: 0,
        insertBefore: 3,
        targetPosition: 2,
        expectedStartId: "sp1",
        expectedTargetId: "sp2",
      });
      await waitFor(() => expect(refresh).toHaveBeenCalled());
      expect(Array.from(document.querySelectorAll(".register-position"), (cell) => cell.textContent)).toEqual(["1", "2", "3"]);
    });

    it("houdt de verplaatste volgorde, ververst niet en zet slepen uit als de snapshot na de PUT niet bijwerkte", async () => {
      vi.mocked(savePlaylistOrder).mockResolvedValue({ refreshed: false, pending: false, rateLimitedUntil: null });
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={order} />);
      fireEvent.keyDown(grip(1), { key: "ArrowDown" });
      await screen.findByText(/klik op Sync met Spotify/);
      expect(titles()).toEqual(["Nummer 2", "Nummer 1", "Nummer 3"]);
      expect(refresh).not.toHaveBeenCalled();
      expect(grip(1).getAttribute("aria-disabled")).toBe("true");
    });

    it("meldt een lokaal bewaarde verplaatsing als informatie, niet als fout, en ververst de pagina", async () => {
      vi.mocked(savePlaylistOrder).mockResolvedValue({ refreshed: true, pending: true, rateLimitedUntil: Date.now() + 3_600_000 });
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={order} />);
      fireEvent.keyDown(grip(1), { key: "ArrowDown" });
      const note = await screen.findByText(/Bewaard in de hub; Spotify volgt zodra het weer kan/);
      expect(note.className).not.toContain("is-error");
      await waitFor(() => expect(refresh).toHaveBeenCalled());
      expect(titles()).toEqual(["Nummer 2", "Nummer 1", "Nummer 3"]);
    });

    it("meldt kort dat een rij zonder plek in de playlist niet verplaatst kan worden", () => {
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={{ ...order, positions: { [three[0].id]: 0 } }} />);
      fireEvent.keyDown(grip(1), { key: "ArrowDown" });
      expect(screen.getByText(/niet in de playlist/)).toBeTruthy();
      expect(savePlaylistOrder).not.toHaveBeenCalled();
    });

    it("zet de oude volgorde terug en meldt de fout als het verplaatsen mislukt", async () => {
      vi.mocked(savePlaylistOrder).mockRejectedValue(new Error("Spotify zegt nee"));
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={order} />);
      fireEvent.keyDown(grip(3), { key: "ArrowUp" });
      await screen.findByText(/Verplaatsen mislukt: Spotify zegt nee/);
      expect(titles()).toEqual(["Nummer 1", "Nummer 2", "Nummer 3"]);
      expect(refresh).not.toHaveBeenCalled();
    });

    it("ververst de pagina en toont de melding als Spotify de playlist intussen anders had", async () => {
      vi.mocked(savePlaylistOrder).mockRejectedValue(new PlaylistOrderError("De playlist was in Spotify gewijzigd.", true));
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={order} />);
      fireEvent.keyDown(grip(1), { key: "ArrowDown" });
      await screen.findByText(/in Spotify gewijzigd/);
      expect(titles()).toEqual(["Nummer 1", "Nummer 2", "Nummer 3"]);
      expect(refresh).toHaveBeenCalled();
    });

    it("zet het slepen uit zolang er gesorteerd is, en weer aan als het sorteren uit is", () => {
      render(<TrackRegister rows={three} artistCount={1} compact playlistOrder={order} />);
      const title = screen.getByRole("button", { name: /dkj_title/ });
      fireEvent.click(title);
      expect(grip(1).getAttribute("aria-disabled")).toBe("true");
      fireEvent.keyDown(grip(1), { key: "ArrowDown" });
      expect(savePlaylistOrder).not.toHaveBeenCalled();
      fireEvent.click(title);
      fireEvent.click(title);
      expect(grip(1).getAttribute("aria-disabled")).toBe("false");
    });
  });

  it("heeft geen plek-kolom in de gewone tabel", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(document.querySelector(".register-position")).toBeNull();
  });

  it("trekt in de compacte tabel een lijn onder rij 36, en alleen daar", () => {
    render(<TrackRegister rows={rows.slice(0, 40)} artistCount={1} compact />);
    const cut = document.querySelectorAll(".register-mix-cut");
    expect(cut).toHaveLength(1);
    expect(cut[0].querySelector(".register-position")?.textContent).toBe("36");
    cleanup();
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(document.querySelector(".register-mix-cut")).toBeNull();
  });

  it("toont 100 rijen per pagina", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(bodyRows()).toHaveLength(100);
    fireEvent.click(screen.getByRole("button", { name: "Volgende" }));
    expect(bodyRows()).toHaveLength(50);
    expect(screen.getByText(/pagina 2 van 2/)).toBeTruthy();
  });

  it("filtert op dkj_bpm en springt terug naar pagina 1", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Volgende" }));
    fireEvent.change(screen.getByLabelText(/dkj_bpm/), { target: { value: "176BPM" } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Blue Full (m)")).toBeTruthy();
    expect(screen.getByText("1 van 150 nummers")).toBeTruthy();
  });

  it("toont één playlist als link, en meer dan één als menu", () => {
    const playlists = ["Een", "Twee", "Drie"].map((name, i) => ({ id: `p${i}`, name }));
    render(<TrackRegister rows={[row(1, { playlists: [playlists[0]] }), row(2, { playlists })]} artistCount={1} />);
    const single = screen.getByRole("link", { name: "Een" });
    expect(single.getAttribute("href")).toBe("https://open.spotify.com/playlist/p0");
    expect(single.getAttribute("target")).toBe("_blank");
    expect(screen.queryByRole("link", { name: "Drie" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /3 playlists/ }));
    expect(screen.getByRole("link", { name: "Drie" }).getAttribute("href")).toBe("https://open.spotify.com/playlist/p2");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Drie" })).toBeNull();
  });

  it("toont djcylow_mix alleen in de verborgen kolommen: één mix als link naar djcylow.com, meer dan één als menu", () => {
    const mixes = ["Een", "Twee"].map((name, i) => ({ slug: `red-light-m-edm-128bpm-2026061${i}`, name }));
    render(<TrackRegister rows={[row(1, { mixes: [mixes[0]] }), row(2, { mixes })]} artistCount={1} />);
    expect(screen.queryByRole("button", { name: /djcylow_mix/ })).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "verborgen kolommen" }));
    expect(screen.getByRole("link", { name: "Een" }).getAttribute("href")).toBe(
      "https://djcylow.com/luister/mix/red-light-m-edm-128bpm-20260610"
    );
    fireEvent.click(screen.getByRole("button", { name: /2 mixes/ }));
    expect(screen.getByRole("link", { name: "Twee" }).getAttribute("href")).toBe(
      "https://djcylow.com/luister/mix/red-light-m-edm-128bpm-20260611"
    );
  });

  it("kapt dkj_title af, met de volledige titel als tooltip, en toont dkj_file, dkj_artist, dkj_track_id en dkj_artist_id standaard niet", () => {
    const dkjTitle = "Bryde's Whale (New Ordinance Edit) (Extended Mix)";
    const file = `Airdraw, Jo.E & Aaren - ${dkjTitle}`;
    render(<TrackRegister rows={[row(1, { dkjTitle, file })]} artistCount={1} />);
    expect(screen.getByTitle(dkjTitle).className).toContain("register-oneline");
    expect(screen.queryByTitle(file)).toBeNull();
    expect(screen.queryByRole("button", { name: /dkj_file/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^dkj_artist/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /dkj_track_id/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /dkj_artist_id/ })).toBeNull();
  });

  it("wisselt met de switch naar de verborgen kolommen en terug", () => {
    const headers = () => [...document.querySelectorAll(".register-table thead code")].map((c) => c.textContent);
    const file = "Airdraw, Jo.E & Aaren - Bryde's Whale";
    render(<TrackRegister rows={[row(1, { file })]} artistCount={1} />);
    const toggle = screen.getByRole("switch", { name: "verborgen kolommen" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(headers()).toContain("dkj_title");
    expect(headers()).toContain("year");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(headers()).toEqual(["dkj_track_id", "dkj_file", "dkj_artist", "dkj_artist_id", "djcylow_mix"]);
    expect(screen.getByTitle(file)).toBeTruthy();
    expect(screen.getByText("ART01-001")).toBeTruthy();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(headers()).not.toContain("dkj_file");
    expect(headers()).toContain("dkj_title");
  });

  it("zet in de verborgen kolommen één artiest-ID als chip, en meer in een menu met de namen", () => {
    render(
      <TrackRegister
        rows={[
          row(1, { artistIds: ["AAA01"], artistNames: ["Aa"] }),
          row(2, { artistIds: ["CCC01", "DDD01", "EEE01"], artistNames: ["Cc", "Dd", "Ee"] }),
        ]}
        artistCount={4}
      />
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByTitle("Aa").textContent).toBe("AAA01");
    expect(screen.queryByText("EEE01")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /3 artists/ }));
    expect(screen.getByText("EEE01")).toBeTruthy();
    expect(screen.getByText("Ee")).toBeTruthy();
  });

  it("laat de sortering vallen bij het wisselen van kolommen", () => {
    render(<TrackRegister rows={[row(1), row(2)]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: /dkj_title/ }));
    expect(screen.getByRole("button", { name: /dkj_title/ }).closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("button", { name: /dkj_title/ }).closest("th")?.getAttribute("aria-sort")).toBe("none");
  });

  it("toont één groep als label en meer groepen als menu, en filtert op elk van de groepen", () => {
    render(
      <TrackRegister rows={[row(1, { groups: ["Prive"] }), row(2, { groups: ["MMC", "DJ CYLOW"] })]} artistCount={1} />
    );
    fireEvent.click(screen.getByRole("button", { name: /2 groups/ }));
    expect(screen.getByText("DJ CYLOW", { selector: ".register-menu-item" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/dkj_group/), { target: { value: "MMC" } });
    expect(screen.getByText("1 van 2 nummers")).toBeTruthy();
  });

  it("toont dkj_genre als label en filtert erop", () => {
    render(<TrackRegister rows={[row(1, { genre: "OST" }), row(2), row(3, { genre: "ALT" })]} artistCount={1} />);
    expect(screen.getByText("OST", { selector: ".register-tag" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/dkj_genre/), { target: { value: "OST" } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("1 van 3 nummers")).toBeTruthy();
  });

  it("toont dkj_rating als kolom met een label", () => {
    render(<TrackRegister rows={[row(1, { rating: "tier-2" }), row(2), row(3, { rating: "tier-8" })]} artistCount={1} />);
    expect(screen.getByRole("columnheader", { name: /dkj_rating/ })).toBeTruthy();
    expect(screen.getByText("tier-8", { selector: ".register-tag" })).toBeTruthy();
  });

  it("toont spotify_playcount als kolom met de korte kop plays, leeg zolang er geen aantal is", () => {
    render(<TrackRegister rows={[row(1, { playcount: "37" }), row(2)]} artistCount={1} />);
    const header = screen.getByRole("columnheader", { name: /plays/ });
    expect(header.querySelector("code")?.textContent).toBe("plays");
    expect(header.querySelector("button")?.getAttribute("title")).toBe("Sorteer op spotify_playcount");
    expect(screen.getByText("37", { selector: ".register-playcount" })).toBeTruthy();
  });

  it("zet per paar tiers een eigen symbool voor de waardering", () => {
    const ratings = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5", "tier-6", "tier-7", "tier-8"];
    const { container } = render(<TrackRegister rows={ratings.map((rating, i) => row(i + 1, { rating }))} artistCount={1} />);
    const shapes = [...container.querySelectorAll(".register-rating-symbol")].map((el) =>
      el.className.replace(/.*register-rating-symbol--/, "")
    );
    expect(shapes).toEqual(["circle", "circle", "triangle", "triangle", "diamond", "diamond", "pentagon", "pentagon"]);
  });

  it("wijzigt dkj_rating via het potloodje en slaat de keuze meteen op", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ trackId: "ART01-001", rating: "tier-6" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TrackRegister rows={[row(1, { rating: "tier-4" })]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "dkj_rating van ART01-001 wijzigen" }));
    expect(screen.getByRole("button", { name: "tier-4" }).getAttribute("aria-current")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "tier-6" }));

    expect(screen.getByText("tier-6", { selector: ".register-tag" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "tier-1" })).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/spotify/rating");
    expect(JSON.parse(init.body as string)).toEqual({ trackId: "ART01-001", rating: "tier-6" });
  });

  it("toont dkj_mix_rating naast dkj_rating, met de korte kop mix rating", () => {
    render(<TrackRegister rows={[row(1, { rating: "tier-2", mixRating: "tier-7" })]} artistCount={1} />);
    const header = screen.getByRole("columnheader", { name: /mix rating/ });
    expect(header.querySelector("button")?.getAttribute("title")).toBe("Sorteer op dkj_mix_rating");
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    const rating = headers.findIndex((h) => h.includes("dkj_rating"));
    expect(headers[rating + 1]).toContain("mix rating");
    expect(screen.getByText("tier-7", { selector: ".register-tag" })).toBeTruthy();
  });

  it("wijzigt dkj_mix_rating via zijn eigen potloodje, los van dkj_rating", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ trackId: "ART01-001", field: "dkj_mix_rating", rating: "tier-8" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TrackRegister rows={[row(1, { rating: "tier-3", mixRating: "tier-4" })]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "dkj_mix_rating van ART01-001 wijzigen" }));
    fireEvent.click(screen.getByRole("button", { name: "tier-8" }));

    expect(screen.getByText("tier-8", { selector: ".register-tag" })).toBeTruthy();
    expect(screen.getByText("tier-3", { selector: ".register-tag" })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ trackId: "ART01-001", rating: "tier-8", field: "dkj_mix_rating" });
  });

  it("zet de vorige dkj_rating terug als opslaan mislukt, met de reden in de tooltip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "save_failed", message: "schijf vol" }), { status: 500 }))
    );
    render(<TrackRegister rows={[row(1, { rating: "tier-4" })]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "dkj_rating van ART01-001 wijzigen" }));
    fireEvent.click(screen.getByRole("button", { name: "tier-8" }));

    await waitFor(() => expect(screen.getByTitle("Opslaan mislukt: schijf vol")).toBeTruthy());
    expect(screen.getByText("tier-4", { selector: ".register-tag" })).toBeTruthy();
  });

  it("filtert op een zelf ingevuld bereik van year", () => {
    render(
      <TrackRegister rows={[row(1, { year: "1999" }), row(2, { year: "2000" }), row(3, { year: "2009" }), row(4)]} artistCount={1} />
    );
    fireEvent.change(screen.getByLabelText("year van"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("year tot"), { target: { value: "2009" } });
    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByText("2 van 4 nummers")).toBeTruthy();
  });

  it("sorteert via de kopregel: oplopend, aflopend, en weer uit", () => {
    render(
      <TrackRegister
        rows={[row(1, { bpm: "112BPM" }), row(2), row(3, { bpm: "96BPM" })]}
        artistCount={1}
      />
    );
    const titles = () => Array.from(bodyRows(), (tr) => tr.querySelector(".register-title")?.textContent);
    const header = screen.getByRole("button", { name: /dkj_bpm/ });
    fireEvent.click(header);
    expect(titles()).toEqual(["Nummer 3", "Nummer 1", "Nummer 2"]);
    expect(header.closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(header);
    expect(titles()).toEqual(["Nummer 1", "Nummer 3", "Nummer 2"]);
    fireEvent.click(header);
    expect(titles()).toEqual(["Nummer 1", "Nummer 2", "Nummer 3"]);
    expect(header.closest("th")?.getAttribute("aria-sort")).toBe("none");
  });

  it("toont bij verschillende albums in de playlists een menu met de kandidaten", () => {
    const candidates = ["Green Full (f)", "Cyan Full (f)"];
    render(
      <TrackRegister
        rows={[row(1, { albumCandidates: candidates }), row(2, { album: "Green Full (f)", albumCandidates: candidates })]}
        artistCount={1}
      />
    );
    // Rij 2 heeft zelf een album gekozen: dan geen menu, alleen dat album.
    const toggles = screen.getAllByRole("button", { name: /2 albums/ });
    expect(toggles).toHaveLength(1);
    fireEvent.click(toggles[0]);
    const menu = document.querySelector(".register-menu-list");
    expect(Array.from(menu?.querySelectorAll(".register-menu-item") ?? [], (item) => item.textContent)).toEqual(candidates);
  });

  it("meldt het als niets past", () => {
    render(<TrackRegister rows={rows} artistCount={1} />);
    fireEvent.change(screen.getByLabelText(/dkj_album/), { target: { value: "Red Light (f)" } });
    expect(screen.getByText("Geen nummer gevonden met deze zoekterm en filters.")).toBeTruthy();
  });

  it("filtert dkj_album op alleen een kleur, telt Light en Full samen, en onthoudt die keuze", () => {
    const withAlbums = [row(1, { album: "Green Light (f)" }), row(2, { album: "Green Full (m)" }), row(3, { album: "Yellow Light (f)" }), row(4)];
    const { unmount } = render(<TrackRegister rows={withAlbums} artistCount={1} />);
    expect(screen.getByRole("option", { name: "Green (2)" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/dkj_album/), { target: { value: "Green" } });
    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByText("2 van 4 nummers")).toBeTruthy();
    unmount();

    render(<TrackRegister rows={withAlbums} artistCount={1} />);
    expect((screen.getByLabelText(/dkj_album/) as HTMLSelectElement).value).toBe("Green");
    expect(bodyRows()).toHaveLength(2);
  });

  it("toont bij dkj_album Leeg en Meerdere kandidaten apart, en filtert op elk", () => {
    const withCandidates = [row(1, { album: "Green Light (f)" }), row(2), row(3, { albumCandidates: ["Green Light (f)", "Cyan Full (f)"] })];
    render(<TrackRegister rows={withCandidates} artistCount={1} />);
    expect(screen.getByRole("option", { name: "Leeg (1)" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Meerdere kandidaten (1)" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/dkj_album/), { target: { value: CANDIDATES_FILTER } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("2 albums")).toBeTruthy();
  });

  it("onthoudt dkj_genre: opnieuw renderen (een nieuw bezoek) herstelt de gekozen waarde", () => {
    const withGenre = [row(1, { genre: "OST" }), row(2), row(3, { genre: "ALT" })];
    const { unmount } = render(<TrackRegister rows={withGenre} artistCount={1} />);
    fireEvent.change(screen.getByLabelText(/dkj_genre/), { target: { value: "OST" } });
    expect(bodyRows()).toHaveLength(1);
    unmount();

    render(<TrackRegister rows={withGenre} artistCount={1} />);
    expect((screen.getByLabelText(/dkj_genre/) as HTMLSelectElement).value).toBe("OST");
    expect(bodyRows()).toHaveLength(1);
  });

  it("rendert gewoon met de standaardstand bij corrupte localStorage, en negeert een onbekende dkj_genre", () => {
    window.localStorage.setItem(REGISTER_PREFS_KEY, "{niet-geldige-json");
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(bodyRows()).toHaveLength(100);

    window.localStorage.setItem(
      REGISTER_PREFS_KEY,
      JSON.stringify({ genre: "BESTAAT-NIET", sort: { key: "geen-kolom", dir: "op-en-neer" }, columnSet: "wat-dan-ook" })
    );
    render(<TrackRegister rows={rows} artistCount={1} />);
    expect(bodyRows().length).toBeGreaterThan(0);
    expect((screen.getAllByLabelText(/dkj_genre/)[0] as HTMLSelectElement).value).toBe("");
  });

  it('zet met "Filters wissen" alles terug naar de standaardstand, en dus ook de opgeslagen stand', () => {
    const withGenre = [row(1, { genre: "OST" }), row(2), row(3, { genre: "ALT" })];
    const { unmount } = render(<TrackRegister rows={withGenre} artistCount={1} />);
    expect(screen.queryByRole("button", { name: "Filters wissen" })).toBeNull();

    fireEvent.change(screen.getByLabelText(/dkj_genre/), { target: { value: "OST" } });
    const clear = screen.getByRole("button", { name: "Filters wissen" });
    fireEvent.click(clear);
    expect((screen.getByLabelText(/dkj_genre/) as HTMLSelectElement).value).toBe("");
    expect(bodyRows()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Filters wissen" })).toBeNull();
    unmount();

    render(<TrackRegister rows={withGenre} artistCount={1} />);
    expect((screen.getByLabelText(/dkj_genre/) as HTMLSelectElement).value).toBe("");
  });

  it("speelt een track met één klik af in één speler onderin de tabel, en sluit hem met dezelfde knop", async () => {
    const ctrl = { loadUri: vi.fn(), play: vi.fn(), destroy: vi.fn(), addListener: vi.fn() };
    const createController = vi.fn((_el: HTMLElement, _opts: { uri: string }, cb: (c: typeof ctrl) => void) => cb(ctrl));
    vi.mocked(loadSpotifyIframeApi).mockResolvedValue({ createController });
    render(<TrackRegister rows={[row(1), row(2), row(3, { spotifyTrackId: null })]} artistCount={1} />);
    expect(document.querySelector(".register-player")).toBeNull();

    // De eerste track: een speler met die URI, die speelt zodra hij klaar is.
    fireEvent.click(screen.getByRole("button", { name: "Nummer 1 afspelen" }));
    await waitFor(() => expect(createController).toHaveBeenCalledTimes(1));
    expect(createController.mock.calls[0][1].uri).toBe("spotify:track:sp1");
    const [event, onReady] = ctrl.addListener.mock.calls[0];
    expect(event).toBe("ready");
    onReady();
    expect(ctrl.play).toHaveBeenCalledTimes(1);

    // Een volgende track: dezelfde speler, meteen aan het spelen.
    fireEvent.click(screen.getByRole("button", { name: "Nummer 2 afspelen" }));
    expect(ctrl.loadUri).toHaveBeenCalledWith("spotify:track:sp2");
    expect(ctrl.play).toHaveBeenCalledTimes(2);
    expect(createController).toHaveBeenCalledTimes(1);

    // Sluiten: eerst schuift de speler omlaag, pas aan het eind van die animatie is hij weg.
    fireEvent.click(screen.getByRole("button", { name: "Speler van Nummer 2 sluiten" }));
    const player = document.querySelector(".register-player") as HTMLElement;
    expect(player.classList.contains("is-closing")).toBe(true);
    expect(screen.getByRole("button", { name: "Nummer 2 afspelen" })).toBeTruthy();
    // jsdom kent geen AnimationEvent, dus React luistert daar naar de naam met prefix: vuur ze allebei.
    fireEvent.animationEnd(player);
    fireEvent(player, new Event("webkitAnimationEnd", { bubbles: true }));
    expect(document.querySelector(".register-player")).toBeNull();
    expect(ctrl.destroy).toHaveBeenCalled();
  });

  it("haalt de speler bij sluiten ook weg als animationend nooit komt (tabblad niet in beeld)", async () => {
    const ctrl = { loadUri: vi.fn(), play: vi.fn(), destroy: vi.fn(), addListener: vi.fn() };
    vi.mocked(loadSpotifyIframeApi).mockResolvedValue({ createController: (_el, _opts, cb) => cb(ctrl) });
    render(<TrackRegister rows={[row(1)]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Nummer 1 afspelen" }));
    fireEvent.click(await screen.findByRole("button", { name: "Speler sluiten" }));
    expect(document.querySelector(".register-player.is-closing")).toBeTruthy();
    await waitFor(() => expect(document.querySelector(".register-player")).toBeNull());
  });

  it("haalt de speler zonder animatie meteen weg bij prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    const ctrl = { loadUri: vi.fn(), play: vi.fn(), destroy: vi.fn(), addListener: vi.fn() };
    vi.mocked(loadSpotifyIframeApi).mockResolvedValue({ createController: (_el, _opts, cb) => cb(ctrl) });
    render(<TrackRegister rows={[row(1)]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Nummer 1 afspelen" }));
    fireEvent.click(await screen.findByRole("button", { name: "Speler sluiten" }));
    expect(document.querySelector(".register-player")).toBeNull();
  });

  it("valt terug op de kale embed als de iFrame API van Spotify niet laadt", async () => {
    vi.mocked(loadSpotifyIframeApi).mockRejectedValue(new Error("geen netwerk"));
    render(<TrackRegister rows={[row(1)]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Nummer 1 afspelen" }));
    const frame = await screen.findByTitle("Spotify-speler: Nummer 1");
    expect(frame.getAttribute("src")).toBe("https://open.spotify.com/embed/track/sp1");
  });

  it("zet de afspeelknop in elke tabel helemaal links", () => {
    const firstCell = () => document.querySelector(".register-table tbody tr td");
    render(<TrackRegister rows={[row(1)]} artistCount={1} />);
    expect(firstCell()?.classList.contains("register-play-cell")).toBe(true);
    fireEvent.click(screen.getByRole("switch"));
    expect(firstCell()?.classList.contains("register-play-cell")).toBe(true);
    cleanup();
    render(<TrackRegister rows={[row(1)]} artistCount={1} compact />);
    expect(firstCell()?.classList.contains("register-play-cell")).toBe(true);
  });

  it("geeft een track zonder spotify_track_id geen afspeelknop", () => {
    render(<TrackRegister rows={[row(1, { spotifyTrackId: null })]} artistCount={1} />);
    expect(screen.queryByRole("button", { name: /afspelen/ })).toBeNull();
  });
});
