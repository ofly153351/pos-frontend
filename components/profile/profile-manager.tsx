"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Store as StoreIcon,
  User,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { friendlyMessage } from "@/lib/form-errors";
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from "@/lib/auth-storage";
import { clearCurrentStoreId, getCurrentStoreId } from "@/lib/store-storage";
import { localeStorageKey, type Locale } from "@/lib/locale-config";
import { changePassword, logout } from "@/services/auth";
import { getStoreById } from "@/services/stores";
import type { AuthPayload } from "@/types/auth";
import th from "@/locales/th.json";

type ProfileDictionary = typeof th.profile;

type ProfileManagerProps = {
  dictionary: ProfileDictionary;
  locale: Locale;
};

// ── Backend capability flags ────────────────────────────────────────────────
// The Go backend (D:\Fork\pos-backend) exposes NONE of these endpoints today.
// Flip a flag to true once the matching API ships — the wired calls below
// activate automatically. Until then the UI validates client-side, persists what
// it safely can on-device, and NEVER fakes a server success.
//   • Profile update   → TODO(backend): PUT /api/me  (name, phone)
//   • Change password  → TODO(backend): PUT /api/me/password  (route already proxied)
//   • Active sessions  → TODO(backend): GET /api/me/sessions  (no per-device data yet)
const CAN_UPDATE_PROFILE: boolean = false;
const CAN_CHANGE_PASSWORD: boolean = false;

const DISPLAY_PREFS_KEY = "pos-display-prefs";
const PROFILE_PREFS_KEY = "pos-profile-prefs";
const DEFAULT_DATE_FORMAT = "dmy";
const DEFAULT_TIME_FORMAT = "24";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-violet-100 text-violet-700",
  manager: "bg-blue-100 text-blue-700",
  cashier: "bg-emerald-100 text-emerald-700",
  platform_admin: "bg-amber-100 text-amber-700",
  admin: "bg-amber-100 text-amber-700",
};

// ── Pure helpers ────────────────────────────────────────────────────────────
function roleLabel(role: string, d: ProfileDictionary): string {
  switch (role) {
    case "owner":
      return d.roleOwner;
    case "manager":
      return d.roleManager;
    case "cashier":
      return d.roleCashier;
    case "platform_admin":
    case "admin":
      return d.roleAdmin;
    default:
      return d.roleUnknown;
  }
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function formatDate(iso: string | undefined, fmt: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  if (fmt === "mdy") return `${mm}/${dd}/${yyyy}`;
  if (fmt === "ymd") return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
}

function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Microsoft Edge";
  if (/opr|opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Browser";
}

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "";
}

// ── Reusable layout pieces ──────────────────────────────────────────────────
function SettingsCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="text-rose-500"> *</span> : null}
    </label>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500";
const readonlyInputClass =
  "w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-400";

export function ProfileManager({ dictionary, locale }: ProfileManagerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [storeName, setStoreName] = useState("");
  const [device, setDevice] = useState({ browser: "", os: "" });

  // Personal information (editable subset)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, startPasswordSave] = useTransition();

  // Preferences
  const [dateFormat, setDateFormat] = useState(DEFAULT_DATE_FORMAT);
  const [timeFormat, setTimeFormat] = useState(DEFAULT_TIME_FORMAT);

  // Sessions
  const [isLoggingOut, startLogout] = useTransition();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const current = getAuthSession();

      // Device-local preferences (no backend yet)
      let phoneValue = "";
      let storedDateFormat = DEFAULT_DATE_FORMAT;
      let storedTimeFormat = DEFAULT_TIME_FORMAT;
      try {
        const rawProfile = window.localStorage.getItem(PROFILE_PREFS_KEY);
        if (rawProfile) {
          phoneValue = (JSON.parse(rawProfile)?.phone as string) ?? "";
        }
        const rawDisplay = window.localStorage.getItem(DISPLAY_PREFS_KEY);
        if (rawDisplay) {
          const parsed = JSON.parse(rawDisplay);
          storedDateFormat = parsed?.dateFormat ?? DEFAULT_DATE_FORMAT;
          storedTimeFormat = parsed?.timeFormat ?? DEFAULT_TIME_FORMAT;
        }
      } catch {
        // Corrupt local prefs — fall back to defaults.
      }

      // Store name (best-effort, mirrors the topbar resolution).
      let resolvedStoreName = "";
      try {
        const storeId = getCurrentStoreId() || current?.store_id;
        if (storeId) {
          const response = await getStoreById(storeId);
          resolvedStoreName = response.data.name ?? "";
        }
      } catch {
        // Store lookup is optional for this page.
      }

      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

      if (!mounted) return;
      setSession(current);
      setFullName(current?.user.name ?? "");
      setPhone(phoneValue);
      setDateFormat(storedDateFormat);
      setTimeFormat(storedTimeFormat);
      setStoreName(resolvedStoreName);
      setDevice({ browser: detectBrowser(ua), os: detectOS(ua) });
      setIsLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">{dictionary.saving}</p>
      </div>
    );
  }

  const email = session?.user.email ?? "";
  const displayName = session?.user.name?.trim() || email || dictionary.roleUnknown;
  const username = email.includes("@") ? email.split("@")[0] : email || displayName;
  const role = (session?.user.role ?? "").toLowerCase();
  const status = (session?.user.status ?? "active").toLowerCase();
  const roleBadgeClass = ROLE_BADGE[role] ?? "bg-slate-100 text-slate-600";
  const createdDisplay = formatDate(session?.user.created_at, dateFormat);
  const isActive = status !== "disabled" && status !== "inactive";

  // ── Handlers ──────────────────────────────────────────────────────────────
  function persistLocalProfile(name: string, phoneValue: string) {
    // Reflect the name in the cached session so the topbar/menu update app-wide.
    const current = getAuthSession();
    if (current) {
      saveAuthSession({ ...current, user: { ...current.user, name } });
    }
    // Phone has no backend column yet — keep it as a device-local preference.
    window.localStorage.setItem(PROFILE_PREFS_KEY, JSON.stringify({ phone: phoneValue }));
  }

  function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    if (!name) {
      toast.error(dictionary.fullNameRequired);
      return;
    }

    try {
      // TODO(backend): when PUT /api/me ships, flip CAN_UPDATE_PROFILE and call the
      // service here to persist name/phone server-side instead of device-only.
      persistLocalProfile(name, phone.trim());
      setSession((prev) => (prev ? { ...prev, user: { ...prev.user, name } } : prev));
      toast.success(CAN_UPDATE_PROFILE ? dictionary.profileSaved : dictionary.profileSavedLocalNote);
    } catch (error) {
      toast.error(friendlyMessage(error));
    }
  }

  function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword) {
      toast.error(dictionary.currentPasswordRequired);
      return;
    }
    if (newPassword.length < 6) {
      toast.error(dictionary.passwordMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(dictionary.passwordMismatch);
      return;
    }

    if (!CAN_CHANGE_PASSWORD) {
      // Backend endpoint not available — be honest, don't fake a success.
      toast.info(dictionary.passwordPendingBackend);
      return;
    }

    startPasswordSave(async () => {
      try {
        await changePassword({ current_password: currentPassword, new_password: newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(dictionary.passwordSuccess);
      } catch (error) {
        toast.error(friendlyMessage(error));
      }
    });
  }

  function handleSavePreferences() {
    try {
      window.localStorage.setItem(
        DISPLAY_PREFS_KEY,
        JSON.stringify({ dateFormat, timeFormat }),
      );
      toast.success(dictionary.preferencesSaved);
    } catch (error) {
      toast.error(friendlyMessage(error));
    }
  }

  function handleSwitchLanguage(next: Locale) {
    if (next === locale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    try {
      window.localStorage.setItem(localeStorageKey, next);
    } catch {
      // localStorage may be unavailable — navigation still applies the locale.
    }
    router.push(segments.join("/") || `/${next}`);
  }

  function handleLogoutAllDevices() {
    if (!window.confirm(dictionary.logoutAllConfirm)) return;
    startLogout(async () => {
      try {
        // token_version is a single global counter — logout invalidates every token.
        await logout();
      } catch {
        // Clear locally regardless of backend outcome.
      }
      clearAuthSession();
      clearCurrentStoreId();
      router.replace(`/${locale}/login`);
      router.refresh();
    });
  }

  const deviceTitle = [device.browser, device.os].filter(Boolean).join(" · ") || dictionary.thisDeviceLabel;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{dictionary.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{dictionary.subtitle}</p>
      </div>

      {/* Profile header */}
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold text-white ring-4 ring-violet-100">
            {initialsOf(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold text-slate-900">{displayName}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass}`}>
                {roleLabel(role, dictionary)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">@{username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-violet-400" />
                {email || dictionary.notAvailable}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <StoreIcon className="h-4 w-4 text-violet-400" />
                {storeName || dictionary.notAvailable}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Personal information */}
          <SettingsCard
            icon={<User className="h-5 w-5" />}
            subtitle={dictionary.personalInfoSubtitle}
            title={dictionary.personalInfoTitle}
          >
            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <div>
                <FieldLabel required>{dictionary.fullNameLabel}</FieldLabel>
                <input
                  className={inputClass}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={dictionary.fullNamePlaceholder}
                  value={fullName}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{dictionary.emailLabel}</FieldLabel>
                  <input className={readonlyInputClass} disabled readOnly value={email} />
                  <p className="mt-1 text-xs text-slate-400">{dictionary.emailReadonlyHint}</p>
                </div>
                <div>
                  <FieldLabel>{dictionary.phoneLabel}</FieldLabel>
                  <input
                    className={inputClass}
                    inputMode="tel"
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={dictionary.phonePlaceholder}
                    value={phone}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>{dictionary.usernameLabel}</FieldLabel>
                <input className={readonlyInputClass} disabled readOnly value={username} />
                <p className="mt-1 text-xs text-slate-400">{dictionary.usernameHint}</p>
              </div>

              {/* TODO(backend): re-enable once PUT /api/me ships — flip CAN_UPDATE_PROFILE. */}
              <div className="flex items-center justify-end gap-3 pt-1">
                {!CAN_UPDATE_PROFILE && (
                  <span className="text-xs font-medium text-amber-600">
                    {dictionary.profileSavedLocalNote}
                  </span>
                )}
                <button className={primaryButtonClass} disabled={!CAN_UPDATE_PROFILE} type="submit">
                  <Save className="h-4 w-4" />
                  {dictionary.saveChanges}
                </button>
              </div>
            </form>
          </SettingsCard>

          {/* Change password */}
          <SettingsCard
            icon={<KeyRound className="h-5 w-5" />}
            subtitle={dictionary.changePasswordSubtitle}
            title={dictionary.changePasswordTitle}
          >
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div>
                <FieldLabel required>{dictionary.currentPasswordLabel}</FieldLabel>
                <input
                  autoComplete="current-password"
                  className={inputClass}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  type="password"
                  value={currentPassword}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>{dictionary.newPasswordLabel}</FieldLabel>
                  <input
                    autoComplete="new-password"
                    className={inputClass}
                    onChange={(event) => setNewPassword(event.target.value)}
                    type="password"
                    value={newPassword}
                  />
                </div>
                <div>
                  <FieldLabel required>{dictionary.confirmPasswordLabel}</FieldLabel>
                  <input
                    autoComplete="new-password"
                    className={inputClass}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    value={confirmPassword}
                  />
                </div>
              </div>
              {/* TODO(backend): re-enable once PUT /api/me/password ships — flip CAN_CHANGE_PASSWORD. */}
              <div className="flex items-center justify-end gap-3 pt-1">
                {!CAN_CHANGE_PASSWORD && (
                  <span className="text-xs font-medium text-amber-600">
                    {dictionary.passwordPendingBackend}
                  </span>
                )}
                <button
                  className={primaryButtonClass}
                  disabled={isSavingPassword || !CAN_CHANGE_PASSWORD}
                  type="submit"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isSavingPassword ? dictionary.updating : dictionary.updatePassword}
                </button>
              </div>
            </form>
          </SettingsCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account information */}
          <SettingsCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title={dictionary.accountInfoTitle}
          >
            <dl className="divide-y divide-slate-100">
              <InfoRow label={dictionary.roleLabel}>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass}`}>
                  {roleLabel(role, dictionary)}
                </span>
              </InfoRow>
              <InfoRow label={dictionary.storeLabel}>{storeName || dictionary.notAvailable}</InfoRow>
              <InfoRow label={dictionary.branchLabel}>{dictionary.notAvailable}</InfoRow>
              <InfoRow label={dictionary.accountStatusLabel}>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isActive ? dictionary.statusActive : dictionary.statusDisabled}
                </span>
              </InfoRow>
              <InfoRow label={dictionary.createdDateLabel}>
                {createdDisplay || dictionary.notAvailable}
              </InfoRow>
              <InfoRow label={dictionary.lastLoginLabel}>{dictionary.notAvailable}</InfoRow>
            </dl>
          </SettingsCard>

          {/* Preferences */}
          <SettingsCard
            icon={<SlidersHorizontal className="h-5 w-5" />}
            subtitle={dictionary.preferencesSubtitle}
            title={dictionary.preferencesTitle}
          >
            <div className="space-y-4">
              <div>
                <FieldLabel>{dictionary.languageLabel}</FieldLabel>
                <div className="inline-flex w-full gap-1 rounded-lg border border-slate-200 p-1">
                  {(["th", "en"] as const).map((code) => (
                    <button
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        locale === code
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-violet-700 hover:bg-violet-50"
                      }`}
                      key={code}
                      onClick={() => handleSwitchLanguage(code)}
                      type="button"
                    >
                      {code === "th" ? dictionary.languageThai : dictionary.languageEnglish}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>{dictionary.dateFormatLabel}</FieldLabel>
                <select
                  className={inputClass}
                  onChange={(event) => setDateFormat(event.target.value)}
                  value={dateFormat}
                >
                  <option value="dmy">{dictionary.dateFormatDMY}</option>
                  <option value="mdy">{dictionary.dateFormatMDY}</option>
                  <option value="ymd">{dictionary.dateFormatYMD}</option>
                </select>
              </div>

              <div>
                <FieldLabel>{dictionary.timeFormatLabel}</FieldLabel>
                <div className="inline-flex w-full gap-1 rounded-lg border border-slate-200 p-1">
                  {(["24", "12"] as const).map((code) => (
                    <button
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        timeFormat === code
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-violet-700 hover:bg-violet-50"
                      }`}
                      key={code}
                      onClick={() => setTimeFormat(code)}
                      type="button"
                    >
                      {code === "24" ? dictionary.timeFormat24 : dictionary.timeFormat12}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400">{dictionary.preferencesHint}</p>

              <div className="flex justify-end">
                <button className={primaryButtonClass} onClick={handleSavePreferences} type="button">
                  <Save className="h-4 w-4" />
                  {dictionary.savePreferences}
                </button>
              </div>
            </div>
          </SettingsCard>

          {/* Active sessions */}
          <SettingsCard
            icon={<Monitor className="h-5 w-5" />}
            title={dictionary.activeSessionsTitle}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                  <Monitor className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{deviceTitle}</p>
                  <p className="truncate text-xs text-slate-500">
                    {dictionary.thisDeviceLabel} · {dictionary.activeNow}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {dictionary.currentBadge}
                </span>
              </div>

              <p className="text-xs text-slate-400">{dictionary.sessionsEmptyDesc}</p>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoggingOut}
                onClick={handleLogoutAllDevices}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                {dictionary.logoutAllDevices}
              </button>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
