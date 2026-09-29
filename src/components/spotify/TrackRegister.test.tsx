// @vitest-environment jsdom
// TrackRegister.tsx: de tabel van /spotify/trackregister. Het filter zelf is getest in register.test.ts,
// het bewaren van de filterstand in registerPrefs.test.ts; hier wat de component zelf beslist: bladeren
// per 100 rijen, dat een filter terugspringt naar pagina 1, en dat de bewaarde stand ook echt terugkomt.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrackRegister } from "./TrackRegister";
import type { RegisterRow } from "@/lib/library/register";
import { REGISTER_PREFS_KEY } from "@/lib/library/registerPrefs";

// Elke test begint met een lege localStorage: anders leest de volgende test de bewaarde stand van de
// vorige terug, en cleanup() ontkoppelt de vorige render (zijn schrijf-effect mag niet meer vuren).
beforeEach(() => window.localStorage.clear());
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
    album: null,
    albumCandidates: [],
    file: `Artiest - Nummer ${n}`,
    dkjTitle: `Nummer ${n}`,
    groups: [],
    playlists: [],
    mixes: [],
    ...over,
  };
}

const bodyRows = () => document.querySelectorAll(".register-table tbody tr");

describe("TrackRegister", () => {
  const rows = [
    ...Array.from({ length: 149 }, (_, i) => row(i + 1)),
    row(150, { bpm: "176BPM", album: "Blue Full (m)" }),
  ];

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

  it("zet de vorige dkj_rating terug als opslaan mislukt, met de reden in de tooltip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "save_failed", message: "schijf vol" }), { status: 500 }))
    );
    render(<TrackRegister rows={[row(1, { rating: "tier-4" })]} artistCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: /wijzigen/ }));
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
});
