/**
 * H-01 regression test — PO quantity semantics shared by the receive editor.
 *
 * Exercises the pure helpers in components/warehouse/receive-shared.ts against the
 * H-01 matrix (ordered 10 × received 0/7/10/12) plus the post-confirm self-counting
 * trap. Run:
 *   bun scripts/test-receive-h01.ts
 *
 * These helpers are the single source of truth consumed by receive-editor.tsx
 * (row view + inspection summary) and receive-inspection-summary.tsx.
 */
import {
  buildReceiveInspection,
  resolveReceiveQty,
} from "../components/warehouse/receive-shared";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function poMapOf(entries: Array<[string, number, number]>) {
  return new Map(entries.map(([productId, ordered, prevReceived]) => [productId, { ordered, prevReceived }]));
}

// ── 1. Row-level resolveReceiveQty: ordered 10 × received 0/7/10/12 ──
console.log("[1] resolveReceiveQty on a draft (verdictsOn) with ordered=10, prevReceived=0");
{
  const base = { hasPo: true, verdictsOn: true, confirmed: false, ordered: 10, prevReceived: 0 };

  const r0 = resolveReceiveQty({ ...base, received: 0 });
  check("received=0 → status not_received", r0.status === "not_received");
  check("received=0 → remainingAfter=10", r0.remainingAfter === 10, String(r0.remainingAfter));
  check("received=0 → difference null (no misleading -10)", r0.difference === null, String(r0.difference));

  const r7 = resolveReceiveQty({ ...base, received: 7 });
  check("received=7 → status short", r7.status === "short", r7.status);
  check("received=7 → remainingAfter=3", r7.remainingAfter === 3, String(r7.remainingAfter));
  check("received=7 → difference -3", r7.difference === -3, String(r7.difference));

  const r10 = resolveReceiveQty({ ...base, received: 10 });
  check("received=10 → status complete", r10.status === "complete", r10.status);
  check("received=10 → remainingAfter=0", r10.remainingAfter === 0, String(r10.remainingAfter));
  check("received=10 → difference 0", r10.difference === 0, String(r10.difference));

  const r12 = resolveReceiveQty({ ...base, received: 12 });
  check("received=12 → status over", r12.status === "over", r12.status);
  check("received=12 → remainingAfter=0", r12.remainingAfter === 0, String(r12.remainingAfter));
  check("received=12 → difference +2", r12.difference === 2, String(r12.difference));
}

// ── 2. Partial receiving across receipts (remainingBefore < ordered) ──
console.log("[2] second receipt on an already-received PO (ordered=10, prevReceived=4)");
{
  const base = { hasPo: true, verdictsOn: true, confirmed: false, ordered: 10, prevReceived: 4 };

  const r6 = resolveReceiveQty({ ...base, received: 6 });
  check("receive remaining 6 → complete (not short vs ordered)", r6.status === "complete", r6.status);
  check("receive remaining 6 → difference 0", r6.difference === 0, String(r6.difference));

  const r5 = resolveReceiveQty({ ...base, received: 5 });
  check("receive 5 of remaining 6 → short", r5.status === "short", r5.status);
  check("receive 5 of remaining 6 → difference -1", r5.difference === -1, String(r5.difference));

  const r7 = resolveReceiveQty({ ...base, received: 7 });
  check("receive 7 (> remaining 6) → over", r7.status === "over", r7.status);
  check("over by 1 vs remaining → difference +1", r7.difference === 1, String(r7.difference));
}

// ── 3. Post-confirm trap: doc counted against itself must show no verdict ──
console.log("[3] confirmed doc (verdicts off) — never emits over/short/complete");
{
  const r = resolveReceiveQty({ hasPo: true, verdictsOn: false, confirmed: true, ordered: 10, prevReceived: 10, received: 10 });
  check("confirmed full doc → status received (factual)", r.status === "received", r.status);
  check("confirmed full doc → difference null", r.difference === null, String(r.difference));
  check("confirmed full doc → remainingAfter 0", r.remainingAfter === 0, String(r.remainingAfter));
}

// ── 4. Summary: totalOrdered uses real ordered, not remaining (H-01 bug #2) ──
console.log("[4] buildReceiveInspection summary totals");
{
  // Draft, first receipt: ordered 10, doc receives 7 → short.
  const draft = buildReceiveInspection({
    hasPo: true,
    verdictsOn: true,
    confirmed: false,
    poMap: poMapOf([["p1", 10, 0]]),
    receivedByProduct: { p1: 7 },
    productName: (id) => id,
  });
  check("draft short → totalOrdered=10 (real ordered, not remaining)", draft.counts.totalOrdered === 10, String(draft.counts.totalOrdered));
  check("draft short → totalReceived=7", draft.counts.totalReceived === 7, String(draft.counts.totalReceived));
  check("draft short → totalRemaining=3 (after this doc)", draft.counts.totalRemaining === 3, String(draft.counts.totalRemaining));
  check("draft short → totalDifference=-3", draft.counts.totalDifference === -3, String(draft.counts.totalDifference));
  check("draft short → short count 1", draft.counts.short === 1, String(draft.counts.short));
  check("draft short → complete/over/notReceived 0", draft.counts.complete === 0 && draft.counts.over === 0 && draft.counts.notReceived === 0, JSON.stringify(draft.counts));
  check("draft short → hasOver false", draft.hasOver === false);
  check("draft short → mismatch.ordered=10 (real ordered, not remaining)", draft.mismatches[0]?.ordered === 10, String(draft.mismatches[0]?.ordered));
  check("draft short → mismatch.difference=-3", draft.mismatches[0]?.difference === -3, String(draft.mismatches[0]?.difference));

  // Confirmed full doc where the PO aggregate already includes this doc's 10.
  const confirmed = buildReceiveInspection({
    hasPo: true,
    verdictsOn: false,
    confirmed: true,
    poMap: poMapOf([["p1", 10, 10]]),
    receivedByProduct: { p1: 10 },
    productName: (id) => id,
  });
  check("confirmed full → totalOrdered=10 (bug was 0)", confirmed.counts.totalOrdered === 10, String(confirmed.counts.totalOrdered));
  check("confirmed full → totalReceived=10", confirmed.counts.totalReceived === 10, String(confirmed.counts.totalReceived));
  check("confirmed full → no verdict counts at all", confirmed.counts.complete === 0 && confirmed.counts.short === 0 && confirmed.counts.over === 0 && confirmed.counts.notReceived === 0, JSON.stringify(confirmed.counts));
  check("confirmed full → no mismatches", confirmed.mismatches.length === 0, String(confirmed.mismatches.length));
  check("confirmed full → hasOver false", confirmed.hasOver === false);
}

// ── 5. Over-receipt still blocked on a draft ──
console.log("[5] over-receive on a draft");
{
  const over = buildReceiveInspection({
    hasPo: true,
    verdictsOn: true,
    confirmed: false,
    poMap: poMapOf([["p1", 10, 0]]),
    receivedByProduct: { p1: 12 },
    productName: (id) => id,
  });
  check("over → status counted", over.counts.over === 1, String(over.counts.over));
  check("over → hasOver true", over.hasOver === true);
  check("over → mismatch.ordered=10", over.mismatches[0]?.ordered === 10, String(over.mismatches[0]?.ordered));
  check("over → mismatch difference +2", over.mismatches[0]?.difference === 2, String(over.mismatches[0]?.difference));
  check("over → totalDifference +2", over.counts.totalDifference === 2, String(over.counts.totalDifference));
}

// ── 6. Scope: PO lines already fully received elsewhere are NOT counted ──
console.log("[6] fully-received PO line excluded when absent from the doc");
{
  const summary = buildReceiveInspection({
    hasPo: true,
    verdictsOn: true,
    confirmed: false,
    poMap: poMapOf([
      ["done", 10, 10], // already fully received by an earlier receipt
      ["open", 10, 0],
    ]),
    receivedByProduct: { open: 7 },
    productName: (id) => id,
  });
  check("excluded done line → notReceived counts only open (0 short)", summary.counts.notReceived === 0, String(summary.counts.notReceived));
  check("totalOrdered excludes done line (10, not 20)", summary.counts.totalOrdered === 10, String(summary.counts.totalOrdered));
  check("open line short count 1", summary.counts.short === 1, String(summary.counts.short));
}

// ── 7. Multiple rows / mixed states sum correctly ──
console.log("[7] mixed receive status across products");
{
  const summary = buildReceiveInspection({
    hasPo: true,
    verdictsOn: true,
    confirmed: false,
    poMap: poMapOf([
      ["a", 10, 0],
      ["b", 5, 0],
      ["c", 3, 0],
    ]),
    receivedByProduct: { a: 10, b: 5, c: 0 },
    productName: (id) => id,
  });
  check("mixed → complete a=1, complete b=1", summary.counts.complete === 2, String(summary.counts.complete));
  check("mixed → notReceived c=1 (qty 0)", summary.counts.notReceived === 1, String(summary.counts.notReceived));
  check("mixed → totalOrdered=18", summary.counts.totalOrdered === 18, String(summary.counts.totalOrdered));
  check("mixed → totalReceived=15", summary.counts.totalReceived === 15, String(summary.counts.totalReceived));
  check("mixed → totalRemaining=3 (c still owed)", summary.counts.totalRemaining === 3, String(summary.counts.totalRemaining));
}

// ── 8. NaN / negative / zero-safety ──
console.log("[8] defensive clamping (never NaN / negative)");
{
  const r = resolveReceiveQty({ hasPo: true, verdictsOn: true, confirmed: false, ordered: Number.NaN, prevReceived: -2, received: Number.NaN });
  check("NaN ordered clamps to 0", r.ordered === 0, String(r.ordered));
  check("negative prevReceived clamps to 0", r.prevReceived === 0, String(r.prevReceived));
  check("NaN received clamps to 0", r.received === 0, String(r.received));
  check("all remainingAfter finite >= 0", Number.isFinite(r.remainingAfter) && r.remainingAfter >= 0, String(r.remainingAfter));

  const noPo = resolveReceiveQty({ hasPo: false, verdictsOn: true, confirmed: false, ordered: 0, prevReceived: 0, received: 5 });
  check("no-PO row → status received", noPo.status === "received", noPo.status);
  check("no-PO row → difference null", noPo.difference === null, String(noPo.difference));
  check("no-PO row → no remaining invented", noPo.remainingAfter === 0 && noPo.remainingBefore === 0, `${noPo.remainingBefore}/${noPo.remainingAfter}`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
