# Changelog

## [Unreleased]

**2 / 2 minor entries** <!-- pending-tally -->

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

