# Quickstart — Weekly Schedules

**Feature**: Weekly Schedules
**Date**: 2026-05-28

How to verify Phase 2 end-to-end. Assumes Phases 0 + 1 are running and
the dev server is up.

## First-time setup (delta against Phase 1)

1. Switch to the branch:
   ```powershell
   git checkout 003-schedules
   ```
2. Apply the new migration:
   ```powershell
   npx prisma migrate dev
   ```
3. Restart the dev server if needed (`npm run dev`).

## Smoke tests

### SC-001 — Create a shift

1. Sign in as a MANAGER. Open `/schedules` from the header.
2. Verify the URL is `/schedules` and the page shows the current week
   (Monday → Sunday), with a "Aucun shift" placeholder in each day.
3. Click "Ajouter un shift". Pick an active employee (e.g. Bob — invite
   one via `/team` if you don't have any). Pick today's date. Start
   11:00, end 15:00, note "Service midi". Save.
4. **Expected**: the new shift appears in the day column for today,
   labelled "Bob 11:00–15:00 — Service midi".

### Edit + delete (US2)

1. Click on the shift you just created. Edit dialog opens.
2. Change end to 17:00. Save.
3. **Expected**: same shift, now 11:00–17:00.
4. Open the shift again and click "Supprimer". Confirm the modal.
5. **Expected**: shift disappears from the view.

### SC-004 — Overlap rejection

1. Create two back-to-back shifts for Bob today: 09:00–13:00 then
   13:00–17:00. **Expected**: both accepted (back-to-back is not an
   overlap).
2. Try to create a third shift 12:00–14:00 for Bob today.
3. **Expected**: rejected with message "Un autre shift de cet employé
   chevauche déjà cette plage horaire."

### Midnight-crossing overlap

1. Create Bob's Monday night shift: date today (assume Monday), start
   22:00, end 06:00. **Expected**: accepted as a single shift spanning
   into tomorrow.
2. Try to create Bob's Tuesday shift: date Tuesday, start 04:00, end
   10:00.
3. **Expected**: rejected with the overlap message (because the Monday
   shift extends into Tuesday at 04:00 < 06:00).

### Week navigation (SC-005)

1. Note the current week's URL (e.g. `/schedules?week=2026-06-08`).
2. Click "Semaine suivante" 12 times.
3. **Expected**: URL changes each click; the view advances 7 days each
   time; total 12 clicks lands you 12 weeks ahead.
4. Paste the URL of week 8 into a new browser tab — you land on the
   same week (bookmarkable).

### SC-002 — Cross-tenant isolation

1. Sign out. Sign up a NEW company "Globex" with founder Carol.
2. As Carol, open `/schedules`.
3. **Expected**: empty week. No trace of Acme's shifts (Jane/Bob).
4. Create a shift for Carol today, 09:00–17:00.
5. Sign back in as Jane (Acme MANAGER). Open `/schedules`.
6. **Expected**: only Acme's shifts. Carol's shift is invisible.

### SC-003 — EMPLOYEE cannot mutate

1. Sign in as Bob (Acme EMPLOYEE). Open `/schedules`.
2. **Expected**: the week view renders, but ONLY shifts assigned to Bob
   are visible (Alice's shifts are not). NO "Ajouter un shift" button.
   Clicking on a shift does NOT open an edit dialog (or the dialog is
   absent entirely).
3. (Adversarial) In the dev console, attempt to POST a crafted form
   to the create action. **Expected**: server rejects (FORBIDDEN).

### SC-007 — Deactivated employee's history persists

1. As Jane, deactivate Bob via `/team`.
2. Open `/schedules`. **Expected**: Bob's existing shifts are STILL
   visible in the week view, with a "désactivé" badge next to his name.
3. Open the "Ajouter un shift" dialog. **Expected**: Bob is NOT in the
   employee dropdown anymore (the picker only shows active employees).
4. Reactivate Bob via `/team`. **Expected**: he reappears in the picker.

### Empty / boundary week

1. Navigate to a week with no shifts.
2. **Expected**: every day labelled; each shows "Aucun shift" (or
   equivalent empty state). No error.

## What this feature explicitly does NOT do (Phase 2)

- No recurring shifts / templates ("every Monday 9–17").
- No drag-and-drop in the week view.
- No notifications (email/push) on create/edit/delete.
- No shift trades / swap requests.
- No time-off / availability layer.
- No time clock / punch in-out.
- No overtime / payroll computation.
- No multi-location / multi-department.
- No bulk operations / CSV import.
- No realtime updates (refresh / re-navigate to see other users' changes).
