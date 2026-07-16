"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { ApiError } from "@/services/api";
import { addMember, listMembers, removeMember, updateMember } from "@/services/members";
import { getAuthSession } from "@/lib/auth-storage";
import { canManageStore, useStoreRole } from "@/lib/use-store-role";
import { Alert } from "@/components/ui/alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";
import type { Member, MemberStatus, StoreRole } from "@/types/member";

type Dict = {
  pageTitle: string;
  pageSubtitle: string;
  addMember: string;
  refresh: string;
  empty: string;
  forbidden: string;
  you: string;
  table: { name: string; email: string; role: string; status: string; joined: string; actions: string };
  roles: Record<StoreRole, string>;
  statusLabels: Record<MemberStatus, string>;
  rowActions: { suspend: string; activate: string; remove: string };
  form: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    role: string;
    submit: string;
    cancel: string;
  };
  confirmRemove: string;
  confirmRemoveTitle: string;
  errors: {
    generic: string;
    nameRequired: string;
    emailRequired: string;
    passwordTooShort: string;
    alreadyMember: string;
    lastOwner: string;
    ownerOnly: string;
    selfRemove: string;
    selfSuspend: string;
  };
  toast: { added: string; updated: string; removed: string };
};

const ROLE_ORDER: StoreRole[] = ["owner", "manager", "cashier", "warehouse"];

const ROLE_BADGE: Record<StoreRole, string> = {
  owner: "bg-violet-100 text-violet-700 border-violet-200",
  manager: "bg-indigo-100 text-indigo-700 border-indigo-200",
  cashier: "bg-slate-100 text-slate-700 border-slate-200",
  warehouse: "bg-amber-100 text-amber-700 border-amber-200",
};

export function StaffManager({ t, locale }: { t: Dict; locale: string }) {
  const queryClient = useQueryClient();
  const { role: storeRole, loading: roleLoading } = useStoreRole();
  const canManage = canManageStore(storeRole);
  const isOwner = storeRole === "owner";
  const currentUserId = getAuthSession()?.user?.id ?? "";

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const membersQuery = useQuery({
    queryKey: ["store-members"],
    queryFn: () => listMembers().then((res) => res.data),
    enabled: canManage,
  });

  function localizeError(err: unknown): string {
    if (err instanceof ApiError) {
      const m = err.message.toLowerCase();
      if (m.includes("already a member")) return t.errors.alreadyMember;
      if (m.includes("last active owner") || m.includes("last owner")) return t.errors.lastOwner;
      if (m.includes("owner can grant")) return t.errors.ownerOnly;
      if (m.includes("remove your own")) return t.errors.selfRemove;
      if (m.includes("suspend your own")) return t.errors.selfSuspend;
      if (m.includes("name is required")) return t.errors.nameRequired;
      if (m.includes("valid email")) return t.errors.emailRequired;
      if (m.includes("at least 8")) return t.errors.passwordTooShort;
      return err.message || t.errors.generic;
    }
    return t.errors.generic;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["store-members"] });
  }

  const updateMutation = useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: { role?: StoreRole; status?: MemberStatus } }) =>
      updateMember(userId, input),
    onSuccess: () => {
      toast.success(t.toast.updated);
      invalidate();
    },
    onError: (err) => toast.error(localizeError(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      toast.success(t.toast.removed);
      setRemoveTarget(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(localizeError(err));
      setRemoveTarget(null);
    },
  });

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  function formatDate(value: string) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : dateFmt.format(d);
  }

  function handleRoleChange(member: Member, nextRole: StoreRole) {
    if (nextRole === member.role) return;
    updateMutation.mutate({ userId: member.user_id, input: { role: nextRole } });
  }

  function handleToggleStatus(member: Member) {
    const nextStatus: MemberStatus = member.status === "active" ? "suspended" : "active";
    updateMutation.mutate({ userId: member.user_id, input: { status: nextStatus } });
  }

  // Defense-in-depth: the sidebar hides this page from non-managers, but enforce here too.
  if (!roleLoading && !canManage) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-6 py-12 text-center">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-medium text-rose-700">{t.forbidden}</p>
        </div>
      </div>
    );
  }

  const members = membersQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t.pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 text-sm font-medium text-violet-600 transition hover:bg-violet-50"
            onClick={() => membersQuery.refetch()}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${membersQuery.isFetching ? "animate-spin" : ""}`} />
            {t.refresh}
          </button>
          <button
            className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
            onClick={() => {
              setErrorBanner(null);
              setIsFormOpen(true);
            }}
            type="button"
          >
            <UserPlus className="h-4 w-4" />
            {t.addMember}
          </button>
        </div>
      </div>

      {errorBanner ? (
        <Alert tone="error" className="mt-4" onDismiss={() => setErrorBanner(null)}>
          {errorBanner}
        </Alert>
      ) : null}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/50 text-xs font-semibold uppercase tracking-wide text-violet-500">
                <th className="px-4 py-3">{t.table.name}</th>
                <th className="px-4 py-3">{t.table.email}</th>
                <th className="px-4 py-3">{t.table.role}</th>
                <th className="px-4 py-3">{t.table.status}</th>
                <th className="px-4 py-3">{t.table.joined}</th>
                <th className="px-4 py-3 text-right">{t.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {membersQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-400" colSpan={6}>
                    …
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-400" colSpan={6}>
                    {t.empty}
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const isSelf = member.user_id === currentUserId;
                  // Only owners may change an existing owner or grant owner; mirror server policy in the UI.
                  const roleLocked = member.role === "owner" && !isOwner;
                  return (
                    <tr key={member.user_id} className="border-b border-violet-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{member.full_name}</span>
                          {isSelf ? (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-600">
                              {t.you}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{member.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 ${ROLE_BADGE[member.role]}`}
                          disabled={roleLocked || updateMutation.isPending}
                          onChange={(e) => handleRoleChange(member, e.target.value as StoreRole)}
                          value={member.role}
                        >
                          {ROLE_ORDER.map((r) => (
                            // Non-owners can't select 'owner'.
                            <option
                              key={r}
                              disabled={r === "owner" && !isOwner}
                              value={r}
                            >
                              {t.roles[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            member.status === "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              member.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {t.statusLabels[member.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(member.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSelf || updateMutation.isPending || (member.role === "owner" && !isOwner)}
                            onClick={() => handleToggleStatus(member)}
                            type="button"
                          >
                            {member.status === "active" ? t.rowActions.suspend : t.rowActions.activate}
                          </button>
                          <button
                            aria-label={t.rowActions.remove}
                            className="rounded-lg border border-rose-200 p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSelf || removeMutation.isPending || (member.role === "owner" && !isOwner)}
                            onClick={() => setRemoveTarget(member)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen ? (
        <AddMemberForm
          t={t}
          isOwner={isOwner}
          onClose={() => setIsFormOpen(false)}
          onSubmitError={(err) => setErrorBanner(localizeError(err))}
          onSuccess={() => {
            setIsFormOpen(false);
            toast.success(t.toast.added);
            invalidate();
          }}
        />
      ) : null}

      <ConfirmModal
        open={removeTarget !== null}
        title={t.confirmRemoveTitle}
        message={t.confirmRemove}
        confirmLabel={t.rowActions.remove}
        cancelLabel={t.form.cancel}
        tone="danger"
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget.user_id);
        }}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}

function AddMemberForm({
  t,
  isOwner,
  onClose,
  onSuccess,
  onSubmitError,
}: {
  t: Dict;
  isOwner: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmitError: (err: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StoreRole>("cashier");

  const mutation = useMutation({
    mutationFn: () => addMember({ name: name.trim(), email: email.trim(), password, role }),
    onSuccess,
    onError: onSubmitError,
  });

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mutation.isPending, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/50 backdrop-blur-sm p-4 smooth-fade">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl smooth-fade-up">
        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-600 px-5 py-4">
          <h2 className="text-base font-bold text-white">{t.form.title}</h2>
          <button
            aria-label={t.form.cancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-4 px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <p className="text-xs text-slate-500">{t.form.subtitle}</p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.form.email}</label>
            <input
              className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.form.name}</label>
            <input
              className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.form.password}</label>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
            <p className="mt-1 text-xs text-slate-400">{t.form.passwordHint}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t.form.role}</label>
            <select
              className="w-full rounded-xl border border-violet-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              onChange={(e) => setRole(e.target.value as StoreRole)}
              value={role}
            >
              {ROLE_ORDER.map((r) => (
                <option key={r} disabled={r === "owner" && !isOwner} value={r}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              {t.form.cancel}
            </button>
            <button
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
              disabled={mutation.isPending}
              type="submit"
            >
              {t.form.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}