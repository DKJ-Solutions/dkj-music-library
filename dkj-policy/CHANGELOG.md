# Changelog

## [Unreleased]

**5 / 5 minor entries** <!-- pending-tally -->

### DEPLOY: feat/compare-card · 20261027-150857Z

Op de homepagina staat een nieuwe card, Compare, met eronder twee vergelijkingen. Playlists ↔ Mixes is de
bestaande brug tussen de mixen van djcylow.com en de MMC-playlists, verhuisd vanaf zijn plek onder Music Mood
Colours (het oude adres stuurt door). PC ↔ Spotify staat er alvast als lege pagina, tot de pc-map gekoppeld is.

**Score:** 3

#### What makes this deploy extra special

De brug tussen mixen en playlists is nu direct vanaf de homepagina te bereiken, in plaats van drie lagen diep
onder Spotify, en er is een vaste plek voor de pc-vergelijking.

**Score:** 3

#### Pull Request

Compare-card op de homepagina, met Playlists ↔ Mixes en PC ↔ Spotify

[PR #105](https://github.com/DKJ-Solutions/dkj-music-library/pull/105)

---

### DEPLOY: feat/mixen-published-card · 20261027-150017Z

/mixen is nu een hub met twee cards, Published en Planned. Planned opent /mixen/planned, dat er alvast
staat maar nog leeg is. Published opent /mixen/published, met een card per mix die op
djcylow.com staat (nieuwste eerst); de detailpagina per mix staat voortaan op /mixen/published/<slug>.

**Score:** 2

#### What makes this deploy extra special

Wie de mixen bekijkt klikt nu eerst door via Published; de oude /mixen/<slug>-links bestaan niet meer.

**Score:** 2

#### Pull Request

Published-card op /mixen met alle mixen die op djcylow.com staan

[PR #104](https://github.com/DKJ-Solutions/dkj-music-library/pull/104)

---

### DEPLOY: feat/home-mixen-card · 20261027-140441Z

De homepagina draagt naast de Spotify-card een Mixen-card die doorklikt naar /mixen, met daar een card per mix van de DJ Cylow-website, nieuwste eerst, elk met genre, BPM en datum. Elke card opent een eigen detailpagina op /mixen/<slug> met de gegevens van de mix, de top-artiesten, de tracklist en een link naar de mixpagina op djcylow.com.

**Score:** 3

#### What makes this deploy extra special

Dave vindt via de homepagina elke mix die hij gemaakt heeft en opent er één met één klik.

**Score:** 3

#### Pull Request

Mixen-card op de homepagina met een card per mix

[PR #103](https://github.com/DKJ-Solutions/dkj-music-library/pull/103)

---

### DEPLOY: fix/release-note-audience-only · 20261027-134623Z

`scripts/repo-config.ps1` now answers `Get-ReleaseNoteSections` with `@('Audience')`, so `cut-release` stops drafting the two organisational sections. Without an answer it drafts all three. The shared default is DKJ-Solutions/dkj-claude-plugins#3584.

**Score:** 2

#### What makes this deploy extra special

The release notes now only say what changed for you. The v0.1.0 note no longer has *What it is worth* or *What was still open at this release*, and the next release notes will not get them either.

**Score:** 2

#### Pull Request

Keep the audience release note to what changed

[PR #102](https://github.com/DKJ-Solutions/dkj-music-library/pull/102)

---

### DEPLOY: feat/release-audience-notes · 20261027-133523Z

Every minor and major release cut now drafts an audience note under `dkj-policy/releases/audience/`,
the note the hub's release-notes page is built from. A patch still gets none.

**Score:** 2

#### What makes this deploy extra special

From the next minor on, each release comes with a note in plain words about what changed for you as a
user of the music library, readable on the release-notes page.

**Score:** 2

#### Pull Request

Draft an audience note at every minor and major release

[PR #101](https://github.com/DKJ-Solutions/dkj-music-library/pull/101)

---

