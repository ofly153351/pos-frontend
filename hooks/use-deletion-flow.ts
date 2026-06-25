"use client";

import { useCallback, useState } from "react";

import { ApiError } from "@/services/api";
import {
  asDeletionErrorDetails,
  deletionVariant,
  variantIsConfirmable,
  type DeletionAssessment,
  type DeletionOutcome,
  type DeletionSuggestedAction,
} from "@/types/lifecycle";

// The minimal identity the dialog needs to render + the flow needs to act.
export type DeletionTarget = { id: string; name: string; code?: string | null };

export type DeletionPhase = "idle" | "assessing" | "ready" | "deleting";

type UseDeletionFlowArgs = {
  // assess runs the read-only pre-check (unwrapped to the bare assessment).
  assess: (id: string) => Promise<DeletionAssessment>;
  // remove runs the smart DELETE with the confirmed action (unwrapped to the outcome).
  remove: (id: string, expected: DeletionSuggestedAction) => Promise<DeletionOutcome>;
  // onSuccess fires after a confirmed archive/delete so the caller can invalidate caches + toast.
  onSuccess?: (outcome: DeletionOutcome, target: DeletionTarget) => void;
};

export type DeletionFlow = {
  open: boolean;
  target: DeletionTarget | null;
  assessment: DeletionAssessment | null;
  phase: DeletionPhase;
  /** Assessment-load or delete error message (shown as a banner; not a blocker remediation). */
  error: string | null;
  /** True when the last confirm bounced because the locked state no longer matched (race). */
  stateChanged: boolean;
  begin: (target: DeletionTarget) => void;
  confirm: () => void;
  cancel: () => void;
  retry: () => void;
};

/**
 * Entity-agnostic delete/archive orchestration. Drives the two-step safe flow:
 *   1. begin()   → GET deletion-assessment (pre-check) → render the adaptive dialog
 *   2. confirm() → DELETE ?expected=<suggested_action>
 * If the locked re-assessment disagrees (concurrent mutation), the backend returns 409 with a
 * fresh assessment in ApiError.details; the flow swaps in that fresh assessment and re-renders
 * so the user re-confirms against current state instead of failing blind.
 */
export function useDeletionFlow({ assess, remove, onSuccess }: UseDeletionFlowArgs): DeletionFlow {
  const [target, setTarget] = useState<DeletionTarget | null>(null);
  const [assessment, setAssessment] = useState<DeletionAssessment | null>(null);
  const [phase, setPhase] = useState<DeletionPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stateChanged, setStateChanged] = useState(false);

  const runAssessment = useCallback(
    async (t: DeletionTarget) => {
      setPhase("assessing");
      setError(null);
      setStateChanged(false);
      setAssessment(null);
      try {
        const result = await assess(t.id);
        setAssessment(result);
        setPhase("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("ready");
      }
    },
    [assess],
  );

  const begin = useCallback(
    (t: DeletionTarget) => {
      setTarget(t);
      void runAssessment(t);
    },
    [runAssessment],
  );

  const retry = useCallback(() => {
    if (target) void runAssessment(target);
  }, [runAssessment, target]);

  const cancel = useCallback(() => {
    setTarget(null);
    setAssessment(null);
    setPhase("idle");
    setError(null);
    setStateChanged(false);
  }, []);

  const confirm = useCallback(() => {
    if (!target || !assessment) return;
    const variant = deletionVariant(assessment);
    if (!variantIsConfirmable(variant)) return; // blocked → nothing to confirm
    const expected = assessment.suggested_action; // "archive" | "hard_delete"

    setPhase("deleting");
    setError(null);
    setStateChanged(false);

    remove(target.id, expected)
      .then((outcome) => {
        onSuccess?.(outcome, target);
        cancel();
      })
      .catch((e) => {
        // 409 with a structured assessment = blocked or raced. Swap in the fresh assessment
        // and re-render so the user re-confirms against current state (no blind failure).
        if (e instanceof ApiError && e.status === 409) {
          const details = asDeletionErrorDetails(e.details);
          if (details) {
            setAssessment(details.assessment);
            setStateChanged(details.code === "ENTITY_STATE_CHANGED");
            setPhase("ready");
            return;
          }
        }
        setError(e instanceof Error ? e.message : String(e));
        setPhase("ready");
      });
  }, [assessment, cancel, onSuccess, remove, target]);

  return {
    open: phase !== "idle",
    target,
    assessment,
    phase,
    error,
    stateChanged,
    begin,
    confirm,
    cancel,
    retry,
  };
}
