# The Record schema

**Everything under `gaps/` is add-only.** State lives in events; text lives in
immutable versions. This makes "no deletion, no overwrite" (invariants 1–3)
true by construction: the gate only ever needs to check that files were
*added*.

## Layout

```
gaps/
  DCCG-001/
    gap.md                      # the gap's birth record — immutable
    events/
      0001-minted.md            # gap lifecycle events, sequence-numbered
    motions/
      1/                        # motion DCCG-001.1
        versions/
          v1.md                 # immutable motion text, version 1
        events/
          0001-recorded.md      # motion lifecycle events
```

## Keys

- A **gap key** is `DCCG-NNN`, zero-padded to three digits, minted once,
  never reused. The key identifies the gap for all time.
- A **motion key** is `DCCG-NNN.M` — the M-th attempt on gap NNN. The
  directory `motions/M/` is authoritative for M.
- Motions of provenance `instrument` are additionally structured as
  Frame / Planks / Close. Motions of provenance `minutes` (reconstructed
  from meeting minutes that predate the instrument) carry the minuted text
  and may lack planks — absences are shown honestly, never invented.

## `gap.md`

```yaml
key: DCCG-001
statement: >-
  The gap statement — the prologue. Written by the creator. The durable
  yardstick review measures against.
minted: 2026-07-14
provenance: minutes | instrument
source: /minutes/2026-06-21-agm        # optional; where this came from
```

`gap.md` holds **no state field**. State is derived by folding the gap's
events, newest-last. A gap with only a `minted` event is **open**.

## Gap events — `events/NNNN-<type>.md`

```yaml
seq: 1
type: minted | closed | dissolved | redirected
date: 2026-07-14
authority: >-
  What makes this event true — e.g. "AGM minutes, 21 June 2026" or
  "instrument: published via compose".
```

Body: optional notes. The four gap states are distinct and never conflated
(invariant 4). There is no `reopened` event: whether a gap can reopen is
**unruled** and therefore unbuilt.

## Motion versions — `motions/M/versions/vN.md`

```yaml
key: DCCG-001.1
version: 1
title: Purchase a water trailer
composed: 2026-06-21
provenance: minutes | instrument
review_date: 2026-12-01          # instrument motions: set by the creator.
                                 # minutes motions: absent if not minuted.
owner_if_carried: ""             # optional
planks:                          # instrument motions: one or more
  - purpose: ...
    why: ...
    outcomes:
      poor: ...
      expected: ...
      good: ...
      exceptional: ...
    irreversible: true | false   # the primitive toggle, per plank
```

Body: the motion text (markdown).

**Motion-level reversibility is never stored.** It derives: any irreversible
plank makes the motion irreversible (invariant 7 by construction — a stored
copy could disagree with the derivation).

**No threshold or axis fields exist.** The constitution holds no threshold
mapping or axis list yet; there is nothing to render and nothing to snapshot
(invariants 8, 9). When the community rules, snapshot fields will be **added**
to new versions — never backfilled into old ones.

## Motion events — `motions/M/events/NNNN-<type>.md`

```yaml
seq: 1
type: recorded | published | tabled | seconded | not_seconded | deferred |
      withdrawn | carried | lost | enacted | reviewed | renewed | reversed |
      superseded | sunset | terminated
date: 2026-06-21
authority: ...
```

- `recorded` — entered into the Record from minutes (pre-instrument history).
- `published` — composed and published through the instrument.
- The terminal set and the review/deferral transitions follow build spec §5.
  Transitions whose operating rules the community has not yet made
  (who records a second, deferral franchise, the review forcing arm) **do not
  occur in this record** until ruled — the instrument shows a wall instead.

## Ordering and integrity

- Event files are zero-padded sequence numbers; the sequence is per-entity
  and gapless. Two writers colliding on the same `seq` fail at commit (the
  path already exists) and retry — the collision is the concurrency control.
- Dates inside record files are dates of governance fact, minuted or
  instrument-stamped. (This is the Record; ballot anonymity constraints
  belong to the future ballot store, not here — no ballot ever writes to
  this repository except as an aggregated, unattributed distribution.)
