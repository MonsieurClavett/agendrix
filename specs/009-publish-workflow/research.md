# Research — 009-publish-workflow

Phase 0 of `/speckit-plan`. The decisions for this phase are deliberately small.

## Decision 1 — Status as enum (vs boolean)

**Decision**: `ShiftStatus { DRAFT PUBLISHED }`.

**Rationale**:
- Future phases will likely add states (`ARCHIVED`, `CANCELED`, etc.); a fixed enum scales without a migration.
- Reads stay self-documenting: `status: "PUBLISHED"` reads better than `isPublished: true`.
- Matches the precedent set in Phase 7 (`TimeOffStatus`).

**Alternatives**:
- *Boolean `isPublished`*: cheaper but less extensible.

## Decision 2 — Backfill direction

**Decision**: Set every existing row to `PUBLISHED` at migration time.

**Rationale**:
- Existing rows were created in a world where every shift was visible to its employee. Defaulting them to `DRAFT` would make them disappear silently, which is the worst possible UX surprise.
- A one-shot `UPDATE` inside the migration is atomic and idempotent.

**Alternatives**:
- *Set to `DRAFT`*: violates SC-005 spirit (no surprise rollover).
- *No backfill, NULL allowed*: complicates the type system and the read path.

## Decision 3 — Where to enforce visibility

**Decision**: Filter on `status: "PUBLISHED"` inside `listShiftsForUserWeek`. The MANAGER read function (`listShiftsForCompanyWeek`) returns all statuses.

**Rationale**:
- Constitution Principle V: server-authoritative auth. Filtering in the page or the component would be defeatable via a crafted query.
- One site changes, one site is auditable.

**Alternatives**:
- *Filter in the page*: rejected (auditability + SC-003).
- *Two new repository functions*: would duplicate the half-open week overlap math.

## Decision 4 — Publish granularity

**Decision**: Publish-by-week. The Server Action accepts `weekStart` (YYYY-MM-DD) and derives the same `WeekRange` the page uses.

**Rationale**:
- Matches the UX (button on the week view).
- Idempotent: the second click finds zero DRAFT and is a no-op (FR-005, SC-006).
- Avoids the per-row id list which would scale poorly for big weeks (current scale is small but the principle is good).

**Alternatives**:
- *Pass an explicit array of shiftIds*: more flexible but the UI doesn't expose per-row selection.
- *Publish-all-pending*: would leak future-week shifts the MANAGER didn't intend to publish yet.

## Decision 5 — Unpublish path

**Decision**: A second small Server Action `unpublishShiftAction` that takes a shiftId, called from the existing `ShiftDialog` only when the shift is `PUBLISHED`.

**Rationale**:
- Single-row mutation, single-row contract. No bulk version yet (YAGNI).
- The button placement inside the existing dialog re-uses the discovery path the MANAGER already knows.

**Alternatives**:
- *Add a status select to the dialog*: more powerful but easy to mis-click.
- *Right-click context menu on the calendar*: discoverability cost outweighs the convenience.

## Decision 6 — Visual treatment for DRAFT

**Decision**: 70% opacity + dashed left border (with a different color than the position accent — use `border-dashed border-l-2 border-muted-foreground/50`) + a small "Brouillon" `Badge` in the top-right corner of the `ShiftBlock`.

**Rationale**:
- The Position accent (Phase 5) already lives on the left border. To avoid conflict, the dashed effect is layered onto the whole card border, not the left accent.
- Opacity is the cheapest universal "not finalized" signal and works alongside the existing icons.
- The text badge reaches accessibility AA contrast on both themes.

**Alternatives**:
- *Striped background pattern*: heavy visual weight on a dense grid.
- *Italic text only*: too subtle.

## Open items

None.
