// @vitest-environment jsdom
// PlaylistManager.tsx: de client-side interactielaag (filteren/groeperen/zoeken/done-toggle) --
// hier alleen de twee stukjes eigen React-state/logica die niet al gedekt zijn door
// playlistFilters.test.ts (pure functies, geen React): de done-toggle-request-sequencing en de
// "wis filters"-knop.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlaylistManager } from "./PlaylistManager";
import type { EnrichedPlaylist } from "@/lib/spotify/enrichedPlaylists";
import type { ParsedPlaylistName } from "@/lib/spotify/parsePlaylistName";

/** De drie naam-velden van PlaylistMixInfo, in de stand "er valt aan de naam niets te doen".
 *
 *  Als losse spread in elke mix-info-fixture hieronder, zodat die fixtures blijven zeggen waar ze over
 *  gaan -- de beschrijving, de genre-lagen, de sortering -- zonder ook de naam-kant te moeten uitschrijven.
 *  `in-sync` rendert namelijk niets in de naam-cel: geen knop, geen merkteken. `titleTarget` blijft `null`
 *  omdat geen enkele fixture-mix een `title_spotify` heeft, en bij `in-sync` leest de component hem niet.
 *
 *  De tests die juist WEL over de naam gaan staan in PlaylistNameSyncButton.test.tsx en zetten deze velden
 *  zelf. */
const naamKlopt = {
  titleState: "in-sync" as const,
  titleTarget: null,
  titleBlocker: null,
};

function makeParsed(overrides: Partial<ParsedPlaylistName> = {}): ParsedPlaylistName {
  return {
    typeLabel: null,
    color: null,
    density: null,
    gender: null,
    bpm: null,
    volume: null,
    contextTag: null,
    matched: false,
    ddSpeed: null,
    ddWord: null,
    ddLoudness: null,
    ddCode: null,
    phaseCode: null,
    feestzaalYear: null,
    ...overrides,
  };
}

function makePlaylist(overrides: Partial<EnrichedPlaylist> = {}): EnrichedPlaylist {
  return {
    id: "p1",
    name: "Green House Mix Full (f)",
    uri: "spotify:playlist:p1",
    collaborative: false,
    public: true,
    snapshotId: "snap-v1",
    owner: { id: "eigen-account-id", displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 42,
    ownerBucket: "dave",
    parsed: makeParsed({ typeLabel: "House Mix", color: "Green", density: "Full", gender: "f" }),
    emotion: "Dankbaar",
    done: false,
    sortBucket: "gesorteerd",
    world: "mmc",
    autoWorld: "mmc",
    worldIsOverridden: false,
    mmcBpm: 128,
    mmcBpmIsOverridden: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlaylistManager -- done-toggle request-sequencing", () => {
  it("een trage, verouderde rollback overschrijft geen latere, alweer geslaagde toggle op dezelfde playlist", async () => {
    const playlist = makePlaylist({ id: "p1", done: false });

    let resolveFirst!: (value: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      // Toggle A (false -> true): blijft hangen, faalt pas helemaal aan het eind van de test.
      .mockImplementationOnce(() => firstRequest)
      // Toggle B (true -> false): snel, slaagt.
      .mockImplementationOnce(() => Promise.resolve({ ok: true } as Response))
      // Toggle C (false -> true): snel, slaagt -- dit is de uiteindelijk bedoelde eindstatus.
      .mockImplementationOnce(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    // A: markeer als afgerond (optimistic: done=true, request A blijft hangen).
    // De optimistische update is synchroon -- fireEvent draait in act(), dus zodra de klik terug is
    // staat de nieuwe stand er al. Vandaar directe asserties in plaats van waitFor(): die wacht op
    // de wandklok, en onder een uitgehongerde event-loop kan zo'n venster verlopen op iets dat allang
    // klaar is. Zie de toelichting bij het einde van deze test.
    fireEvent.click(screen.getByRole("button", { name: /markeer als afgerond/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // B: meteen weer wissen (optimistic: done=false, request B slaagt snel).
    fireEvent.click(screen.getByRole("button", { name: /afgerond -- klik om te wissen/i }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /markeer als afgerond/i })).toBeInTheDocument();

    // C: opnieuw markeren als afgerond (optimistic: done=true, request C slaagt snel) -- dit is de
    // laatste, bedoelde actie: de playlist hoort na deze test als "afgerond" te eindigen.
    fireEvent.click(screen.getByRole("button", { name: /markeer als afgerond/i }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("button", { name: /afgerond -- klik om te wissen/i })).toBeInTheDocument();

    // Nu faalt de allereerste (trage) request A alsnog. Zónder sequencing zou de rollback van A
    // ("zet done terug naar het tegenovergestelde van nextDone=true, dus false") de door C al
    // bevestigde done:true-status stilletjes overschrijven met false -- precies het bug-scenario
    // uit de opdracht.
    // Wachten op de GEBEURTENIS, niet op de klok. De component hangt met haar eigen `await fetch()`
    // achter deze promise; `await firstRequest` sluit daar achteraan, dus zodra dit hervat heeft de
    // catch van A gedraaid. act() spoelt vervolgens het openstaande React-werk door, zodat een
    // rollback die zou toeslaan ook daadwerkelijk gerenderd is vóór er gemeten wordt.
    //
    // Waarom dit meer is dan een langere marge: de negatieve asserties hieronder bewijzen dat er
    // NIETS gebeurde, en zo'n bewijs is precies zo veel waard als de zekerheid dat de rollback zijn
    // kans heeft gehad. Een vaste `setTimeout` geeft die zekerheid niet -- te krap is daar een
    // vals-groen, en het venster van een waitFor() eromheen is onder belasting een vals-rood.
    await act(async () => {
      resolveFirst({ ok: false, status: 500 } as Response);
      await firstRequest;
    });

    expect(screen.getByRole("button", { name: /afgerond -- klik om te wissen/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /markeer als afgerond/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/kon de status.*niet opslaan/i)).not.toBeInTheDocument();
  });
});

describe("PlaylistManager -- 'wis filters'", () => {
  it("toont de knop pas zodra er een actief filter/zoekterm is, en wist alles bij een klik", () => {
    const playlist = makePlaylist({ id: "p1", name: "Green House Mix Full (f)" });
    render(<PlaylistManager playlists={[playlist]} />);

    expect(screen.queryByRole("button", { name: "Wis filters" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Zoek in playlistnamen"), {
      target: { value: "green" },
    });
    expect(screen.getByRole("button", { name: "Wis filters" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wis filters" }));

    expect(screen.queryByRole("button", { name: "Wis filters" })).not.toBeInTheDocument();
    expect((screen.getByLabelText("Zoek in playlistnamen") as HTMLInputElement).value).toBe("");
  });
});

// De sorteerlogica zelf staat in playlistSort.test.ts (pure functies); hier alleen de brug tussen de
// kolomkop-knoppen en die logica: de drieklik-cyclus en het terugvallen op de standaardordening.
describe("PlaylistManager -- sorteren op een kolomkop", () => {
  const namenInTabel = () =>
    Array.from(document.querySelectorAll(".playlist-row .name")).map((el) => el.textContent);

  const drie = [
    makePlaylist({ id: "p1", name: "Gamma", sortBucket: "gesorteerd" }),
    makePlaylist({ id: "p2", name: "Alfa", sortBucket: "ongesorteerd" }),
    makePlaylist({ id: "p3", name: "Beta", sortBucket: "gesorteerd" }),
  ];

  it("sorteert alfabetisch op de eerste klik, aflopend op de tweede, en wist de sortering op de derde", () => {
    render(<PlaylistManager playlists={drie} />);

    // Standaard: de ordening van flattenForList -- ongesorteerde playlists onderaan.
    expect(namenInTabel()).toEqual(["Gamma", "Beta", "Alfa"]);

    fireEvent.click(screen.getByRole("button", { name: "Sorteer op Naam" }));
    expect(namenInTabel()).toEqual(["Alfa", "Beta", "Gamma"]);

    fireEvent.click(screen.getByRole("button", { name: /Naam — nu gesorteerd oplopend/ }));
    expect(namenInTabel()).toEqual(["Gamma", "Beta", "Alfa"]);

    fireEvent.click(screen.getByRole("button", { name: /Naam — nu gesorteerd aflopend/ }));
    // Terug naar de standaardordening: Alfa is ongesorteerd en zakt weer naar de bodem.
    expect(namenInTabel()).toEqual(["Gamma", "Beta", "Alfa"]);
    expect(screen.getByRole("button", { name: "Sorteer op Naam" })).toBeInTheDocument();
  });

  it("sorteert op de mix-kolommen via de meegegeven mix-info, met lege cellen onderaan", () => {
    const playlists = [
      makePlaylist({ id: "zonder", name: "Zonder mix" }),
      makePlaylist({ id: "techno", name: "Met techno" }),
      makePlaylist({ id: "house", name: "Met house" }),
    ];
    render(
      <PlaylistManager
        playlists={playlists}
        mixInfoById={{
          techno: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260101", family: "EDM", genre: "Techno", subgenre: "Melodic Techno" },
          house: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20250101", family: "EDM", genre: "House", subgenre: "Tech House" },
        }}
      />
    );

    // De tabel opent op `ID gevuld: Ja`, dus "Zonder mix" staat er niet; "Nee" erbij zetten haalt hem
    // binnen zodat deze test de lege-cel-ordening kan toetsen.
    fireEvent.click(screen.getByRole("button", { name: "Nee" }));

    fireEvent.click(screen.getByRole("button", { name: "Sorteer op Genre" }));
    expect(namenInTabel()).toEqual(["Met house", "Met techno", "Zonder mix"]);

    // Ook aflopend blijft de lege cel onderaan -- niet bovenaan.
    fireEvent.click(screen.getByRole("button", { name: /Genre — nu gesorteerd oplopend/ }));
    expect(namenInTabel()).toEqual(["Met techno", "Met house", "Zonder mix"]);
  });

  it("verwisselt van kolom zonder de richting mee te nemen (nieuwe kolom begint oplopend)", () => {
    render(<PlaylistManager playlists={drie} />);

    fireEvent.click(screen.getByRole("button", { name: "Sorteer op Naam" }));
    fireEvent.click(screen.getByRole("button", { name: /Naam — nu gesorteerd oplopend/ }));
    // Nu staat Naam op aflopend; een klik op Tracks moet oplopend beginnen.
    fireEvent.click(screen.getByRole("button", { name: "Sorteer op Tracks" }));

    expect(screen.getByRole("button", { name: /Tracks — nu gesorteerd oplopend/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sorteer op Naam" })).toBeInTheDocument();
  });
});

describe("PlaylistManager -- ID-filter (gevuld ja/nee)", () => {
  const namenInTabel = () =>
    Array.from(document.querySelectorAll(".playlist-row .name")).map((el) => el.textContent);

  const playlists = [
    makePlaylist({ id: "met", name: "Met mix" }),
    makePlaylist({ id: "zonder", name: "Zonder mix" }),
  ];
  const mixen = {
    met: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260303", family: "EDM" as const, genre: "House", subgenre: "Tech House" },
  };

  it("opent op 'Ja' -- de playlists met een ID zijn de belangrijke", () => {
    render(<PlaylistManager playlists={playlists} mixInfoById={mixen} />);
    expect(namenInTabel()).toEqual(["Met mix"]);
  });

  it("scheidt de rijen met en zonder gekoppelde mix", () => {
    render(<PlaylistManager playlists={playlists} mixInfoById={mixen} />);

    // Vanuit de openingsstand ("Ja") "Nee" erbij: Ja+Nee samen = alles.
    fireEvent.click(screen.getByRole("button", { name: "Nee" }));
    expect(namenInTabel()).toEqual(["Met mix", "Zonder mix"]);

    // "Ja" eraf laat alleen de rijen zonder mix over.
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(namenInTabel()).toEqual(["Zonder mix"]);

    // En terug naar de openingsstand.
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    fireEvent.click(screen.getByRole("button", { name: "Nee" }));
    expect(namenInTabel()).toEqual(["Met mix"]);
  });

  it("toont de wis-knop pas bij een afwijking van de openingsstand, niet meteen", () => {
    render(<PlaylistManager playlists={playlists} mixInfoById={mixen} />);
    expect(screen.queryByRole("button", { name: "Wis filters" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nee" }));
    expect(screen.getByRole("button", { name: "Wis filters" })).toBeInTheDocument();

    // Wissen zet terug naar de openingsstand ("Ja"), niet naar "alles".
    fireEvent.click(screen.getByRole("button", { name: "Wis filters" }));
    expect(namenInTabel()).toEqual(["Met mix"]);
    expect(screen.queryByRole("button", { name: "Wis filters" })).not.toBeInTheDocument();
  });

  it("opent leeg zonder mix-bron -- anders zou de tabel leeg zijn", () => {
    render(<PlaylistManager playlists={playlists} />);
    expect(namenInTabel()).toEqual(["Met mix", "Zonder mix"]);
  });

  it("staat uit zolang er helemaal geen mix-bron is -- dan valt er niets te scheiden", () => {
    render(<PlaylistManager playlists={playlists} />);
    expect(screen.getByRole("button", { name: "Ja" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nee" })).toBeDisabled();
  });
});

describe("PlaylistManager -- tellers boven de tabel", () => {
  const statRegels = () =>
    Array.from(document.querySelectorAll(".stats .stat")).map((el) => el.textContent);

  it("telt het totaal en het aantal met een gevulde ID-cel, over alle playlists", () => {
    render(
      <PlaylistManager
        playlists={[
          makePlaylist({ id: "a", name: "A" }),
          makePlaylist({ id: "b", name: "B" }),
          makePlaylist({ id: "c", name: "C" }),
        ]}
        mixInfoById={{
          a: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260303", family: "EDM", genre: "House", subgenre: null },
          b: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20250101", family: "EDM", genre: "Techno", subgenre: null },
        }}
      />
    );
    expect(statRegels()).toEqual(["3playlists", "2met ID"]);
  });

  it("blijft het totaal tonen terwijl je filtert -- een stabiel ijkpunt, geen verspringend getal", () => {
    render(
      <PlaylistManager
        playlists={[makePlaylist({ id: "a", name: "Alfa" }), makePlaylist({ id: "b", name: "Beta" })]}
        mixInfoById={{ a: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260303", family: "EDM", genre: "House", subgenre: null } }}
      />
    );
    fireEvent.change(screen.getByLabelText("Zoek in playlistnamen"), { target: { value: "alfa" } });

    expect(document.querySelectorAll(".playlist-row").length).toBe(1);
    expect(statRegels()).toEqual(["2playlists", "1met ID"]);
  });

  it("laat de ID-teller weg zonder mix-bron -- '0 met ID' zou een probleem suggereren dat er niet is", () => {
    render(<PlaylistManager playlists={[makePlaylist({ id: "a", name: "A" })]} />);
    expect(statRegels()).toEqual(["1playlists"]);
  });

  describe("sync-check tegen de DJ Cylow-bron", () => {
    const metTweeGekoppeld = {
      a: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260303", family: "EDM" as const, genre: "House", subgenre: null },
      b: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20250101", family: "EDM" as const, genre: "Techno", subgenre: null },
    };
    const tweePlaylists = [makePlaylist({ id: "a", name: "A" }), makePlaylist({ id: "b", name: "B" })];

    it("zet een vinkje als elk mix-ID uit de bron een eigen playlist heeft", () => {
      render(
        <PlaylistManager playlists={tweePlaylists} mixInfoById={metTweeGekoppeld} mixesWithId={2} />
      );
      const sync = document.querySelector(".stat-sync")!;
      expect(sync.textContent).toBe("✓");
      expect(sync.getAttribute("data-in-sync")).toBe("true");
      expect(sync.getAttribute("title")).toContain("In sync");
    });

    it("zet een kruis met het verschil in de tooltip als de bronnen uiteenlopen", () => {
      render(
        <PlaylistManager playlists={tweePlaylists} mixInfoById={metTweeGekoppeld} mixesWithId={5} />
      );
      const sync = document.querySelector(".stat-sync")!;
      expect(sync.textContent).toBe("✗");
      expect(sync.getAttribute("data-in-sync")).toBe("false");
      // 5 mixen met een ID, 2 gekoppeld -> 3 zonder eigen playlist.
      expect(sync.getAttribute("title")).toContain("3 mixen hebben nog geen eigen playlist");
    });

    it("toont de check niet op een weergave waar de vergelijking niet opgaat (geen mixesWithId)", () => {
      render(<PlaylistManager playlists={tweePlaylists} mixInfoById={metTweeGekoppeld} />);
      expect(document.querySelector(".stat-sync")).toBeNull();
      expect(statRegels()).toEqual(["2playlists", "2met ID"]);
    });
  });
});

// De ENIGE actie in deze interface die iets buiten de hub wijzigt: de mix-velden in de
// Spotify-playlistbeschrijving zetten. Vandaar ook een test op het rollback-pad.
describe("PlaylistManager -- de beschrijving naar Spotify schrijven", () => {
  const playlist = makePlaylist({ id: "p1", name: "House Mix 🟡 Yellow Full (m) 🟡 Vol. 1" });
  const viaTracklist = {
    p1: {
      ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [],
      mixId: "20260303",
      family: "EDM" as const,
      genre: "House",
      subgenre: "Tech House",
    },
  };
  const knop = () =>
    screen.queryByRole("button", { name: /velden van mix 20260303 in de Spotify-beschrijving/ });

  it("toont de knop alleen waar de beschrijving nog niet klopt", () => {
    const { unmount } = render(<PlaylistManager playlists={[playlist]} mixInfoById={viaTracklist} />);
    expect(knop()).toBeInTheDocument();
    unmount();

    // Klopt de beschrijving al met de JSON, dan valt er niets te schrijven.
    render(
      <PlaylistManager
        playlists={[playlist]}
        mixInfoById={{ p1: { ...viaTracklist.p1, matchedBy: "declared-id", descriptionState: "in-sync" } }}
      />
    );
    expect(knop()).not.toBeInTheDocument();
    expect(document.querySelector('.mix-id[data-key="declared"]')).not.toBeNull();
  });

  // De derde stand (2026-07-25): de beschrijving staat er, maar wijkt per veld af van de JSON -- bv.
  // omdat het Vol.-nummer in de mix-data is bijgesteld nadat de beschrijving is geschreven.
  it("biedt bij een afwijkende beschrijving een BIJWERK-knop, met de afwijking in de tooltip", () => {
    render(
      <PlaylistManager
        playlists={[playlist]}
        mixInfoById={{
          p1: {
            ...viaTracklist.p1,
            matchedBy: "declared-id",
            descriptionState: "outdated",
            descriptionDiffs: [{ field: "volume", inDescription: "1", inMix: "6" }],
          },
        }}
      />
    );

    const bijwerken = screen.getByRole("button", {
      name: /Werk de Spotify-beschrijving van .* bij naar mix 20260303/,
    });
    // Ander merkteken dan een ontbrekende beschrijving: "≠" tegen "#".
    expect(bijwerken).toHaveTextContent("≠");
    expect(document.querySelector('.mix-id[data-state="outdated"]')).not.toBeNull();
    // De cel vertelt wélk veld afwijkt en wat er zou moeten staan.
    expect(document.querySelector(".mix-id")?.getAttribute("title")).toContain(
      'volume is "1", moet "6"'
    );
  });

  it("toont geen knop op een rij zonder gekoppelde mix", () => {
    render(<PlaylistManager playlists={[playlist]} />);
    expect(knop()).not.toBeInTheDocument();
  });

  it("post het playlist- en mix-ID en markeert de rij direct als getagd", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} mixInfoById={viaTracklist} />);
    fireEvent.click(knop()!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/spotify/mix-tag");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      playlistId: "p1",
      mixId: "20260303",
    });

    // Optimistic: het merkteken staat er en de knop is weg, zonder op een nieuwe sync te wachten.
    await waitFor(() => expect(document.querySelector('.mix-id[data-key="declared"]')).not.toBeNull());
    expect(knop()).not.toBeInTheDocument();
  });

  it("draait de markering terug en geeft de REDEN van de route door", async () => {
    // Deze test legde eerder de vaste tekst over de schrijf-scope vast -- precies de onjuiste aanname die
    // 48 mislukte schrijfacties de verkeerde kant op stuurde (Dave, 2026-07-25). Wat nu vaststaat is dat
    // de melding van de server dóórkomt, want alleen die weet wat er echt misging.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "spotify_error",
          status: 403,
          message:
            "Spotify weigert de wijziging (403): The user is not registered for this application.",
        }),
        { status: 502 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} mixInfoById={viaTracklist} />);
    fireEvent.click(knop()!);

    await waitFor(() =>
      expect(screen.getByText(/not registered for this application/)).toBeInTheDocument()
    );
    // Terug naar de beginstand: geen merkteken, knop weer beschikbaar.
    expect(document.querySelector('.mix-id[data-key="declared"]')).toBeNull();
    expect(knop()).toBeInTheDocument();
  });

  it("meldt het nog steeds als er géén leesbare reden is -- dan zonder toelichting", async () => {
    // Netwerk weg, of een antwoord zonder body: de mislukking mag niet stil blijven.
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} mixInfoById={viaTracklist} />);
    fireEvent.click(knop()!);

    await waitFor(() =>
      expect(screen.getByText(/Kon de beschrijving van playlist/)).toBeInTheDocument()
    );
    expect(knop()).toBeInTheDocument();
  });
});

describe("PlaylistManager -- alle beschrijvingen in één keer", () => {
  const drieZonderTag = [
    makePlaylist({ id: "p1", name: "Een" }),
    makePlaylist({ id: "p2", name: "Twee" }),
    makePlaylist({ id: "p3", name: "Drie" }),
  ];
  const mixen = {
    p1: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260101", family: "EDM" as const, genre: "House", subgenre: null },
    p2: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260202", family: "EDM" as const, genre: "House", subgenre: null },
    p3: { ...naamKlopt, matchedBy: "declared-id" as const, descriptionState: "in-sync" as const, descriptionDiffs: [], mixId: "20260303", family: "EDM" as const, genre: "House", subgenre: null },
  };
  // Zonder de meervoud-uitgang in het patroon: bij één rij heet de knop "...1 playlistbeschrijving bij".
  const bulkKnop = () => screen.queryByRole("button", { name: /playlistbeschrijving/ });

  it("noemt alleen de rijen waar de beschrijving nog niet klopt", () => {
    render(<PlaylistManager playlists={drieZonderTag} mixInfoById={mixen} />);
    // p3 klopt al, p1 en p2 niet.
    expect(bulkKnop()).toHaveTextContent("Werk 2 playlistbeschrijvingen bij op Spotify");
  });

  // Een afwijkende beschrijving hoort net zo goed in de werkvoorraad als een ontbrekende: beide zijn
  // met dezelfde schrijfactie op te lossen, en anders zou "de inhoud komt overeen" stil onwaar blijven.
  it("rekent een afwijkende beschrijving mee, niet alleen een ontbrekende", () => {
    render(
      <PlaylistManager
        playlists={drieZonderTag}
        mixInfoById={{
          ...mixen,
          p3: {
            ...mixen.p3,
            descriptionState: "outdated" as const,
            descriptionDiffs: [{ field: "volume" as const, inDescription: "1", inMix: "6" }],
          },
        }}
      />
    );
    expect(bulkKnop()).toHaveTextContent("Werk 3 playlistbeschrijvingen bij op Spotify");
  });

  it("verschijnt niet als alle beschrijvingen kloppen", () => {
    render(
      <PlaylistManager
        playlists={[makePlaylist({ id: "p3", name: "Drie" })]}
        mixInfoById={{ p3: mixen.p3 }}
      />
    );
    expect(bulkKnop()).not.toBeInTheDocument();
  });

  it("post één keer per rij die bijgewerkt moet worden en meldt het resultaat", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={drieZonderTag} mixInfoById={mixen} />);
    fireEvent.click(bulkKnop()!);

    await waitFor(() =>
      expect(screen.getByText(/2 beschrijvingen op Spotify bijgewerkt\./)).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string))).toEqual([
      { playlistId: "p1", mixId: "20260101" },
      { playlistId: "p2", mixId: "20260202" },
    ]);
    // De knop is weg: er valt niets meer te doen.
    expect(bulkKnop()).not.toBeInTheDocument();
  });

  it("gaat door na een fout -- één weigering blokkeert de rest niet", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={drieZonderTag} mixInfoById={mixen} />);
    fireEvent.click(bulkKnop()!);

    await waitFor(() =>
      expect(screen.getByText(/1 beschrijving op Spotify bijgewerkt/)).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Het aantal mislukte staat er eerlijk bij, en die rij houdt zijn eigen knopje.
    expect(screen.getByText(/1 mislukt/)).toBeInTheDocument();
    expect(bulkKnop()).toHaveTextContent("Werk 1 playlistbeschrijving bij op Spotify");
  });

  // WAAROM DEZE TEST BESTAAT: de bulk-actie meldde "0 bijgewerkt; 48 mislukt" en zweeg over de oorzaak,
  // terwijl elk van die 48 antwoorden hem bevatte (Dave, 2026-07-25). Een aantal zonder reden is geen
  // melding maar een raadsel.
  it("noemt de reden van de eerste mislukking bij de uitslag", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "spotify_error",
          status: 403,
          message:
            "Spotify weigert de wijziging (403): The user is not registered for this application.",
        }),
        { status: 502 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={drieZonderTag} mixInfoById={mixen} />);
    fireEvent.click(bulkKnop()!);

    await waitFor(() => expect(screen.getByText(/2 mislukt/)).toBeInTheDocument());
    expect(
      screen.getByText(/Reden van de eerste: .*not registered for this application/)
    ).toBeInTheDocument();
  });
});

describe("PlaylistManager -- wereld-correctie", () => {
  it("corrigeert de wereld optimistisch, post naar /api/spotify/world en toont het reset-knopje", async () => {
    const playlist = makePlaylist({ id: "p1", world: "mmc", worldIsOverridden: false });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/Wereld van Green House Mix Full \(f\)/i);
    fireEvent.change(select, { target: { value: "djcylow" } });

    // Optimistic: de select springt direct om, ongeacht of de POST al is afgehandeld.
    expect((select as HTMLSelectElement).value).toBe("djcylow");
    expect(
      screen.getByRole("button", { name: /wereld-correctie van .* terugzetten naar geraden/i })
    ).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/spotify/world",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ playlistId: "p1", world: "djcylow" }),
      })
    );
  });

  it("draait de correctie terug als de POST faalt, en toont de foutmelding", async () => {
    const playlist = makePlaylist({ id: "p1", world: "mmc", worldIsOverridden: false });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/Wereld van Green House Mix Full \(f\)/i);
    fireEvent.change(select, { target: { value: "prive" } });

    await waitFor(() => expect((select as HTMLSelectElement).value).toBe("mmc"));
    expect(screen.getByText(/kon de wereld.*niet opslaan/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /wereld-correctie van .* terugzetten naar geraden/i })
    ).not.toBeInTheDocument();
  });

  it("zet een handmatige override terug naar de auto-classificatie via het reset-knopje", async () => {
    // "Green House Mix Full (f)" is eigen + House Mix-typeLabel + een Vol.-nummer ->
    // classifyWorld() gokt "mmc" (zie classifyWorld.test.ts), en dat komt als autoWorld van de
    // server mee -- de playlist begint hier met een override naar "prive".
    const playlist = makePlaylist({
      id: "p1",
      world: "prive",
      autoWorld: "mmc",
      worldIsOverridden: true,
      parsed: makeParsed({ typeLabel: "House Mix", color: "Green", density: "Full", gender: "f", volume: 1 }),
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/Wereld van Green House Mix Full \(f\)/i);
    expect((select as HTMLSelectElement).value).toBe("prive");

    fireEvent.click(
      screen.getByRole("button", { name: /wereld-correctie van .* terugzetten naar geraden/i })
    );

    expect((select as HTMLSelectElement).value).toBe("mmc"); // optimistisch, direct
    expect(
      screen.queryByRole("button", { name: /wereld-correctie van .* terugzetten naar geraden/i })
    ).not.toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/spotify/world",
      expect.objectContaining({ body: JSON.stringify({ playlistId: "p1", world: null }) })
    );
  });

  it("een trage, verouderde rollback overschrijft geen latere, alweer geslaagde correctie op dezelfde playlist", async () => {
    const playlist = makePlaylist({ id: "p1", world: "mmc", worldIsOverridden: false });

    let resolveFirst!: (value: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      // Correctie A (mmc -> djcylow): blijft hangen, faalt pas aan het eind van de test.
      .mockImplementationOnce(() => firstRequest)
      // Correctie B (djcylow -> prive): snel, slaagt -- de uiteindelijk bedoelde eindstatus.
      .mockImplementationOnce(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);
    const select = screen.getByLabelText(/Wereld van Green House Mix Full \(f\)/i);

    // Directe asserties: de correctie is optimistisch en dus synchroon na fireEvent -- zie de
    // done-toggle-variant van deze test bovenaan dit bestand voor waarom hier geen waitFor() staat.
    fireEvent.change(select, { target: { value: "djcylow" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(select, { target: { value: "prive" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((select as HTMLSelectElement).value).toBe("prive");

    // Nu faalt de allereerste (trage) correctie A alsnog -- zonder sequencing zou de rollback van
    // A ("terug naar mmc") de door B al bevestigde "prive"-stand stilletjes overschrijven. Wachten
    // op de gebeurtenis in plaats van op de klok, zoals hierboven.
    await act(async () => {
      resolveFirst({ ok: false, status: 500 } as Response);
      await firstRequest;
    });

    expect((select as HTMLSelectElement).value).toBe("prive");
    expect(screen.queryByText(/kon de wereld.*niet opslaan/i)).not.toBeInTheDocument();
  });
});

describe("PlaylistManager -- BPM-kolom: select alleen voor MMC, daarbuiten de geparsede BPM", () => {
  it("toont GEEN BPM-select/reset voor een niet-MMC-playlist, ook als classifyMmcBpm() toevallig een tier zou raden", () => {
    // "Drum & Bass Mix | 176BPM" zonder Vol.-nummer -> world: "prive" (classifyWorld.ts regel 7),
    // maar classifyMmcBpm() wordt voor ELKE playlist berekend (zie enrichedPlaylists.ts) en zou
    // hier alsnog 176 raden via het typeLabel. De BPM-select hoort dus niet te verschijnen -- de
    // BPM-correctie is alleen betekenisvol binnen MMC. De kolom valt buiten MMC terug op de uit de
    // naam geparsede BPM als platte tekst (sinds de twee BPM-kolommen zijn samengevoegd).
    const playlist = makePlaylist({
      id: "p1",
      name: "Drum & Bass Mix | 176BPM",
      world: "prive",
      worldIsOverridden: false,
      mmcBpm: 176,
      mmcBpmIsOverridden: false,
      parsed: makeParsed({ typeLabel: "Drum & Bass (Mix)", bpm: 176 }),
    });
    render(<PlaylistManager playlists={[playlist]} />);

    expect(screen.queryByLabelText(/BPM van/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /bpm-correctie van .* terugzetten naar geraden/i })
    ).not.toBeInTheDocument();
    // ...maar de geparsede BPM zelf staat er wél, als tekst in dezelfde kolom. Gericht op de cel
    // via de selector: "176" staat ook op een BPM-filterchip in de toolbar (KNOWN_BPM_TIERS).
    expect(screen.getByText("176", { selector: ".playlist-row .bpm" })).toBeInTheDocument();
  });

  it("toont de BPM-select wél voor een MMC-playlist", () => {
    const playlist = makePlaylist({ id: "p1", world: "mmc" });
    render(<PlaylistManager playlists={[playlist]} />);

    expect(screen.getByLabelText(/BPM van/i)).toBeInTheDocument();
  });
});

describe("PlaylistManager -- BPM-correctie", () => {
  it("corrigeert de BPM-tier optimistisch, post naar /api/spotify/bpm en toont het reset-knopje", async () => {
    const playlist = makePlaylist({ id: "p1", mmcBpm: 128, mmcBpmIsOverridden: false });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/BPM van Green House Mix Full \(f\)/i);
    fireEvent.change(select, { target: { value: "176" } });

    // Optimistic: de select springt direct om, ongeacht of de POST al is afgehandeld.
    expect((select as HTMLSelectElement).value).toBe("176");
    expect(
      screen.getByRole("button", { name: /bpm-correctie van .* terugzetten naar geraden/i })
    ).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/spotify/bpm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ playlistId: "p1", bpm: 176 }),
      })
    );
  });

  it("draait de correctie terug als de POST faalt, en toont de foutmelding", async () => {
    const playlist = makePlaylist({ id: "p1", mmcBpm: 128, mmcBpmIsOverridden: false });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/BPM van Green House Mix Full \(f\)/i);
    fireEvent.change(select, { target: { value: "96" } });

    await waitFor(() => expect((select as HTMLSelectElement).value).toBe("128"));
    expect(screen.getByText(/kon de bpm-tier.*niet opslaan/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /bpm-correctie van .* terugzetten naar geraden/i })
    ).not.toBeInTheDocument();
  });

  it("zet een handmatige BPM-override terug naar de auto-classificatie via het reset-knopje", async () => {
    // "Green House Mix Full (f)" met typeLabel "House Mix" -> classifyMmcBpm() gokt 128 (zie
    // classifyBpm.test.ts) -- de playlist begint hier met een override naar 176.
    const playlist = makePlaylist({ id: "p1", mmcBpm: 176, mmcBpmIsOverridden: true });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/BPM van Green House Mix Full \(f\)/i);
    expect((select as HTMLSelectElement).value).toBe("176");

    fireEvent.click(
      screen.getByRole("button", { name: /bpm-correctie van .* terugzetten naar geraden/i })
    );

    expect((select as HTMLSelectElement).value).toBe("128"); // optimistisch, direct
    expect(
      screen.queryByRole("button", { name: /bpm-correctie van .* terugzetten naar geraden/i })
    ).not.toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/spotify/bpm",
      expect.objectContaining({ body: JSON.stringify({ playlistId: "p1", bpm: null }) })
    );
  });

  it("toont 'Overig' als de effectieve BPM null is (geen enkele classifyMmcBpm-regel van toepassing)", () => {
    const playlist = makePlaylist({
      id: "p1",
      mmcBpm: null,
      mmcBpmIsOverridden: false,
      parsed: makeParsed(),
    });
    render(<PlaylistManager playlists={[playlist]} />);

    const select = screen.getByLabelText(/BPM van Green House Mix Full \(f\)/i) as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(screen.getByRole("option", { name: "Overig" })).toBeInTheDocument();
  });

  it("een trage, verouderde rollback overschrijft geen latere, alweer geslaagde BPM-correctie op dezelfde playlist", async () => {
    const playlist = makePlaylist({ id: "p1", mmcBpm: 128, mmcBpmIsOverridden: false });

    let resolveFirst!: (value: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      // Correctie A (128 -> 96): blijft hangen, faalt pas aan het eind van de test.
      .mockImplementationOnce(() => firstRequest)
      // Correctie B (96 -> 176): snel, slaagt -- de uiteindelijk bedoelde eindstatus.
      .mockImplementationOnce(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistManager playlists={[playlist]} />);
    const select = screen.getByLabelText(/BPM van Green House Mix Full \(f\)/i);

    // Directe asserties: de correctie is optimistisch en dus synchroon na fireEvent -- zie de
    // done-toggle-variant van deze test bovenaan dit bestand voor waarom hier geen waitFor() staat.
    fireEvent.change(select, { target: { value: "96" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(select, { target: { value: "176" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((select as HTMLSelectElement).value).toBe("176");

    // Nu faalt de allereerste (trage) correctie A alsnog -- zonder sequencing zou de rollback van
    // A ("terug naar 128") de door B al bevestigde "176"-stand stilletjes overschrijven. Wachten
    // op de gebeurtenis in plaats van op de klok, zoals hierboven.
    await act(async () => {
      resolveFirst({ ok: false, status: 500 } as Response);
      await firstRequest;
    });

    expect((select as HTMLSelectElement).value).toBe("176");
    expect(screen.queryByText(/kon de bpm-tier.*niet opslaan/i)).not.toBeInTheDocument();
  });
});
