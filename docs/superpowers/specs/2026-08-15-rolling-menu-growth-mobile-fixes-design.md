# Rolling Menus, Growth Summaries, and Mobile Interaction Fixes

## Objective

Make weekly menus start on the day they are generated, retain at most six menus per baby, show the latest growth measurements in the growth summary cards, remove nap-to-meal scheduling, and fix the iPhone interaction/layout problems on the Settings page and growth timeline filter.

## Constraints

- Existing imported menus keep their original dates and remain available as history.
- Existing user records and V1 backup compatibility must be preserved.
- Old `napToMealMinutes` fields may remain in imported data but are ignored.
- Browser zoom must remain available for accessibility; the fix must address layout overflow or hit-testing rather than disabling zoom.
- Current uncommitted `README.md` and `AGENTS.md` changes are user-owned and out of scope.

## Menu Date and Retention Model

- A newly generated menu starts on the current local calendar date and covers seven consecutive dates.
- Menu identity is the exact `babyId + startDate`, not a containing Monday-to-Sunday natural week.
- Regenerating on the same local date prompts for confirmation and overwrites that menu while preserving its stable identity where possible.
- An imported older natural-week menu is not treated as today's current menu unless its `startDate` exactly equals today.
- Each baby retains at most six menus total, including the current menu and historical menus.
- After a successful save, menus for that baby are sorted by start date, with stable timestamp/id tie-breaking, and only the oldest excess menus are deleted.
- Menus belonging to another baby are never counted or deleted.

## Growth Summary Cards

- With no matching record, the card continues to show `添加记录`.
- The weight card shows the latest valid weight in kilograms and its record date.
- The height card shows the latest valid height in centimeters and its record date.
- The tooth card shows the latest tooth record number and its date.
- Latest means the greatest valid local record date, with a stable timestamp/id fallback for records on the same date.
- Cards remain buttons that open the existing add-record workflow.
- Malformed or incomplete records are skipped rather than breaking the growth page.

## Schedule and Sleep Behavior

- Remove the `午睡结束后多久吃辅食（分钟）` field from the configurable schedule dialog.
- Saving a schedule no longer writes or updates `napToMealMinutes`.
- Completing, editing, moving, or deleting a nap no longer moves a meal automatically.
- Night-sleep anchoring of wake time and subsequent schedule items remains unchanged.
- Backup validation continues accepting old templates that contain `napToMealMinutes`; the field is ignored by current behavior.

## Mobile Layout and Interaction

- Diagnose and remove width overflow and hit-area overlap on the Settings (`我的`) page at iPhone widths.
- Settings selects, buttons, file controls, and long text must wrap or size within the content column.
- Do not add `user-scalable=no` or otherwise disable pinch zoom.
- Keep the full-timeline filter as a compact native select instead of converting it to multiple buttons.
- Ensure the timeline select has a phone-sized touch target, correct stacking order, and no overlay intercepting taps.
- Keep the full timeline in a bounded region sized to show roughly three days of recent entries; additional entries scroll vertically inside that region instead of lengthening the entire growth page.
- Internal timeline scrolling must remain usable after changing the record-type filter and must not create document-level horizontal overflow.
- Verify that the whole document has no horizontal overflow at 320px and 375px, while intentional internal chart scrolling remains contained.

## Data Flow

1. Import replaces storage as before, then reloads the active baby and menus.
2. Current-menu selection compares menu `startDate` directly with today's local date.
3. Generation creates today-through-six-days-later and saves it transactionally.
4. The same transaction or coordinated persistence boundary removes only excess menus for the same baby after the new menu is safely stored.
5. Growth rendering derives latest summaries from the already loaded snapshot; it does not add extra repository reads.

## Error Handling

- A failed menu save or retention cleanup must not leave the in-memory store claiming success.
- Invalid menu dates are rejected with the existing menu validation style.
- Growth cards fall back to `添加记录` when no valid value exists.
- Missing mobile controls or stale DOM targets fail safely without blocking the rest of the page.

## Verification

- Automated tests cover today-based seven-day generation, same-day overwrite, imported older menus remaining historical, six-menu retention, baby isolation, and rollback/error behavior.
- Automated tests cover latest weight, height, and tooth summaries, including invalid and same-date records.
- Automated tests prove naps no longer move meals while night sleep anchoring still works.
- UI contract tests cover removal of the nap setting, accessible timeline select behavior, bounded internal timeline scrolling, and responsive Settings controls.
- Manual browser acceptance at 320px and 375px checks Settings pinch/layout recovery, timeline filter tapping, three-day-height internal timeline scrolling, today-based menu dates, latest growth values, and absence of document-level horizontal overflow.
- Full `npm.cmd test`, `npm.cmd run check`, and `git diff --check` must pass before release.

## Rollback

- Revert the feature commits to restore natural-week menu selection, the previous growth-card labels, and prior sleep behavior.
- No migration rewrites imported historical menu dates, so rollback does not require data repair.
- Menu retention is destructive for the seventh-oldest menu; release notes and tests must make the six-menu limit explicit before deployment.
