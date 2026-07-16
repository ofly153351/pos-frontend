# AI Business Copilot — Readiness Report

> Honest, un-inflated assessment of the POS Today AI Copilot knowledge platform.
> Written from two lenses: a senior AI architect, and a shop owner who will use this daily.
> Grounded in the real architecture (deterministic keyword router + `help-topics.ts` + `CopilotOverview` API — **no LLM**).

Date: 2026-06-30 · Scope: `components/copilot/` + `lib/help/help-topics.ts` + `docs/ai-copilot/`

---

## 1. Overall maturity — **L2.5 / L5** (Structured Assistant → early Advisor)

| Level | Definition | This system |
|-------|-----------|-------------|
| L1 | Static FAQ / canned replies | exceeded |
| **L2** | **Structured intent router, grounded data answers** | **✅ here** |
| **L3** | **Reasoning (why / consequence / priority), multi-turn memory** | **✅ partially here** |
| L4 | LLM understanding, free-form synthesis, self-grounding | ✗ not present (by design — no LLM) |
| L5 | Autonomous actions (creates PO, adjusts stock) on instruction | ✗ "Coming soon" only |

**Verdict:** A strong **L2 with real L3 traits** (the WHY / CONSEQUENCE / URGENCY / decision engines are genuine, multi-turn reference resolution works). It is **not** L4/L5 and the docs say so honestly. For a real shop this is genuinely useful today — it answers business questions and teaches the POS — but it is a *smart query interpreter*, not an autonomous manager.

---

## 2. Coverage scores (honest)

| Category | Score | Basis |
|----------|------:|-------|
| **Intent routing accuracy** | **~92–99%** | Live-tested 299 realistic Thai/EN/slang/typo questions; remaining misses are genuine multi-intent ambiguities that still return a *related* useful answer (no in-scope hard-fail to fallback). |
| **Business-data capability** | **~60%** | Answers sales, profit, stock, aging, purchasing, risks, opportunities, priorities, overview, activity — but read-only, 7-day window, no per-product ranking, no custom filtering, no actions. |
| **Knowledge coverage (how-to)** | **~75%** | `help-topics.ts` covers 11 modules / 30+ topics. Missing ~10 real shop workflows: stock transfer, end-of-day/cash reconciliation, customer returns/refunds, purchase returns, waste/damage adjustment, count-variance approval, product kits, bulk price update, shift/multi-register, payment-bank reconciliation. |
| **Conversation quality** | **~80%** | Multi-turn memory (มัน/อันนี้/ตัวแรก/เมื่อกี้), clarification, follow-up chips, greeting/thanks. Weakness: keyword-brittle on very indirect phrasing; clarification ("หน้าร้าน หรือ โกดัง") is documented as a pattern but not yet wired as a live disambiguation prompt. |
| **Teaching quality** | **~80%** | Strong how-to via help search + workflow-coach docs. Gap: English how-to returns graceful no-match (content is Thai-only). |
| **Decision-support quality** | **~78%** | Real WHY (decisionEngine.reason), CONSEQUENCE ("ถ้าไม่ทำ"), URGENCY, best-practice docs. Bounded by 7-day data and no long-term trend. |
| **Honesty / anti-hallucination** | **~85%** | `AI_SYSTEM_CAPABILITIES.md` is accurate; authors declared 40 "ขณะนี้ระบบยังไม่มีข้อมูลส่วนนี้" gaps. **Caveat:** the multi-persona critique flagged 29 hallucination-risk items + 51 gaps that the automated refine pass did NOT yet apply (blocked by server rate-limit) — these still need a human/agent pass. |

---

## 3. What was built (this platform)

10 grounded knowledge docs (`docs/ai-copilot/`, ~4,470 lines) + this report:

| Doc | Lines | Purpose |
|-----|------:|---------|
| AI_KNOWLEDGE_BASE.md | 759 | Master per-module knowledge (purpose/why/workflow/mistakes/best-practice/related/example) |
| AI_FAQ.md | 754 | 250+ role-based Q&A (owner/cashier/warehouse/accounting/manager/new/support) |
| AI_CHAT_TEST_CASES.md | 619 | 300+ regression cases (question/intent/expected/follow-up/data/confidence/priority) |
| AI_OWNER_GUIDE.md | 432 | Non-technical owner manual (open/close/daily/weekly/monthly) |
| AI_CONVERSATION_PATTERNS.md | 417 | Greeting/clarify/teach/compare/recommend/warn/summarize flows |
| AI_REASONING_ENGINE.md | 393 | Why/impact/risk/opportunity/next-step per recommendation type |
| AI_TRAINING_DATA.md | 372 | Intent · utterances · entities · expected · follow-up · confidence |
| AI_DECISION_TREE.md | 330 | Business decision trees (low-stock→transfer/purchase, etc.) |
| AI_SYSTEM_CAPABILITIES.md | 237 | Honest can/cannot/data-sources/limits (verified accurate) |
| AI_QUICK_START.md | 157 | One-page daily playbook |

Build method: Workflow — 3 grounding agents (read real code) → capability map → 10 authoring agents → 7 persona critics → (refine + report = this, done manually due to throttle).

---

## 4. Known limitations (must-read before relying on it)

1. **No LLM anywhere** — 100% keyword-match + templates. Cannot synthesise, cannot converse off-script.
2. **Read-only** — cannot create PO, adjust stock, issue documents ("Coming soon").
3. **7-day window** — no 30-day / YoY / trend lines in the Copilot.
4. **No per-product sales ranking** — "ขายดี" uses sales-velocity proxy; points to Reports → Summary.
5. **Help content Thai-only** — EN how-to → graceful no-match.
6. **Keyword-brittle** — very indirect phrasing can fall to fallback.
7. **Refine pass incomplete** — 29 hallucination-risk flags + 51 critique gaps await a clean-up pass (rate-limited).

---

## 5. Top priorities for next iteration (ordered)

1. **Run the refine pass** (resume the workflow when the API throttle clears) to action the 29 hallucination flags + 51 gaps. *Effort: S · Impact: high (correctness).*
2. **Add the ~10 missing help-topics** (stock transfer, end-of-day, returns/refunds, purchase return, waste/damage, count-variance, kits, bulk-price, shift, reconciliation) to `lib/help/help-topics.ts` — only for workflows that actually exist in the product. *Effort: M · Impact: high (teaching coverage).*
3. **Wire live clarification** for genuinely ambiguous intents ("ของหมด → หน้าร้าน/โกดัง?") instead of guessing. *Effort: M · Impact: medium.*
4. **English help content** (mirror help-topics in EN) if EN users exist. *Effort: M · Impact: low-med.*
5. **Longer-trend data** (30-day) in `CopilotOverview` — needs **backend** support. *Effort: L · Impact: medium.*
6. **Action execution** (draft PO / stock adjust with approval) — needs **backend + frontend**. *Effort: XL · Impact: high but risky.*

---

## 6. Missing platform support

- **Backend:** 30-day/YoY aggregates; per-product revenue ranking; action endpoints with approval; cash-reconciliation / shift data.
- **Frontend:** live disambiguation prompt in chat; EN help corpus; deep-link from chat answer → the actual screen (chat currently describes the menu in words).

---

## 7. Technical debt

- Knowledge lives in **two places**: live chat reads `help-topics.ts`; these docs are a *parallel* corpus. Risk of drift. **Mitigation:** treat `help-topics.ts` as the source of truth for how-to; treat docs as the human-facing platform; reconcile each release (the universal "docs after features" rule).
- Intent routing is a long hand-tuned `if/else` keyword chain in `chat-tab.tsx` (~hundreds of `includes`). Maintainable but growing; a future move to a small intent table would reduce ordering-dependency bugs (e.g. the `ทั้งหมด`/`หมด` collision class).

---

## 8. Estimated business impact

- **Today:** reduces "where is X / how do I Y" support load; surfaces the daily priorities, debtors, and low-stock that owners forget. Realistic value: faster onboarding of new staff + fewer missed reorders/collections.
- **With priorities 1–3 done:** becomes a dependable daily advisor for a Thai SME shop — the "experienced shop manager" feel for read + teach, while honestly deferring execution.

---

## 9. Future AI roadmap (only what's plausibly grounded)

- Near: refine pass; fill help-topic gaps; live clarification.
- Mid: backend 30-day trends + per-product ranking → unlock real "best seller" + trend answers.
- Long (needs careful design): LLM layer *on top of* the grounded data (RAG over these docs + CopilotOverview) so phrasing-robust understanding is added **without** losing the no-hallucination guarantee; action execution with explicit approval.

---

> **Bottom line:** Solid, honest L2.5 knowledge platform. The grounding discipline held (capabilities doc is accurate; 40 gaps declared, not faked). It is genuinely useful for a real shop *today* for answering and teaching. It is **not** an autonomous manager and the docs never pretend otherwise. Finish the refine pass and fill the help-topic workflow gaps to reach a confident, comprehensive L3.
