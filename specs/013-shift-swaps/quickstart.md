# Quickstart — 013-shift-swaps

## Prerequisites

- `.env` with valid `DATABASE_URL`.
- Migrations applied.
- Dev server running.
- Two EMPLOYEE users (Bob, Carol) and one MANAGER (Alice), each with at least one PUBLISHED shift in the same week.

## Smoke test 1 — Propose a swap (US1)

1. As Bob, navigate to `/schedules` and click on one of your PUBLISHED shifts (say Tue 18:00–22:00).
2. In the dialog, click "Proposer un échange".
3. The propose dialog opens — choose Carol as the peer, choose her Thursday shift, add a message "merci !", submit.
4. ✅ Toast "Échange proposé à Carol.".
5. The shift's card now shows a small "Échange" badge.
6. As Carol, the bell badge shows 1 unread; the notification is `Bob souhaite échanger…`.

## Smoke test 2 — Peer accepts (US2)

1. As Carol, click the notification → land on `/echanges`.
2. In "En attente de ma décision", see the swap. Click "Accepter".
3. ✅ Toast "Acceptation enregistrée.".
4. The row moves out of "incoming" — appears in Bob's "proposed" with status PENDING_MANAGER.
5. Bob's bell shows 1 unread (`Carol a accepté…`).

## Smoke test 3 — Peer rejects (US2)

1. From scratch, Bob proposes another swap to Carol.
2. Carol clicks "Refuser" with reason "indisponible ce jour-là".
3. ✅ Bob receives `SWAP_REJECTED_BY_PEER` notification.

## Smoke test 4 — Manager approves (US3)

1. With a swap in PENDING_MANAGER, sign in as Alice.
2. Go to `/echanges` → "À approuver" section.
3. Click "Approuver".
4. ✅ The two shifts swap `employeeId` instantly.
5. Bob's calendar now shows Carol's old Thursday slot, and vice-versa.
6. Both Bob and Carol receive `SWAP_DECIDED_BY_MANAGER` (APPROVED).

## Smoke test 5 — Manager rejects (US3)

1. Same setup, Alice clicks "Refuser" with reason "surcharge".
2. ✅ Shifts stay as they were. Status `REJECTED_BY_MANAGER`.
3. Bob and Carol both notified.

## Smoke test 6 — Overlap rejection on approve

1. Carol creates a manual shift conflict: she has a shift Tue 17:00–19:00 (overlapping Bob's Tue 18:00–22:00 that's being swapped to her).
2. Alice tries to approve.
3. ✅ Action returns `{ error: "TARGET_OVERLAP" }` with the French message "Carol a déjà un shift qui chevauche cette plage.".

## Smoke test 7 — Proposer cancels (US4)

1. Bob has a PENDING_MANAGER swap.
2. He opens `/echanges` → his "Mes propositions" → clicks "Annuler".
3. ✅ Status flips to CANCELED_BY_PROPOSER. The shift's "Échange" badge disappears.

## Smoke test 8 — Cross-tenant safety

1. As Eve (MANAGER of company Beta), open `/echanges` and try to inspect Bob's swap id via crafted URL or devtools action call.
2. ✅ Repository returns NOT_FOUND. No leak.

## Smoke test 9 — Engagement uniqueness

1. Bob has a PENDING_PEER swap engaging his Tue shift.
2. He opens the same shift and tries to propose another swap to a different peer.
3. ✅ Server returns `SHIFT_ALREADY_ENGAGED`.

## Reset

```powershell
$env:PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = "yes"
npx prisma migrate reset --force
```
