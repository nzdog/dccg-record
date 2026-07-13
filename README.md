# The DCCG Record

The append-only governance record of the Donnellys Crossing Community Group:
its **gaps** (things the community has seen and not yet closed) and its
**motions** (attempts to close them).

## Status: provisional

This record was created for the demonstration to the DCCG meeting of
**19 July 2026**. The Motion Template instrument is not installed by authority
— it goes through the community's own process (build spec §13). Whether this
record is adopted, and whether its demonstration-era contents carry forward
into the adopted record, is **the community's decision**.

## The rules this repository lives by

1. **Nothing under `gaps/` is ever modified or deleted.** Every change is a
   new file. The gate (`.github/workflows/gate.yml`) enforces this on every
   push and every pull request.
2. **State is an event, not an edit.** A gap closes by gaining a `closed`
   event file, never by editing `gap.md`. A motion carries by gaining a
   `carried` event file, never by editing its version.
3. **Versions are immutable files.** `versions/v1.md` never changes; an
   amended motion gains `versions/v2.md`. A link to a version resolves to the
   same words forever.
4. **History is protected.** Force pushes and branch deletion are disabled.
   Every version of every file remains addressable by commit hash in
   perpetuity.

The schema is documented in [SCHEMA.md](SCHEMA.md). The reasons live in the
site repository under `docs/governance/` — read the build spec's §0 before
touching anything here.

## Who writes here

The Motion Template instrument (via its publish function), and nothing else.
There is no CMS pointed at this repository and no human editing workflow.
If you are a human about to push here, stop and read
[SCHEMA.md](SCHEMA.md) and the build spec first.
