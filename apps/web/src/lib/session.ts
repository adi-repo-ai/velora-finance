// Session rules on this device, enforced by <SessionGuard>:
//   • signed out after a period of no activity (30 minutes, or 30 days with "Remember me");
//   • without "Remember me", also signed out when the browser is closed.
const REMEMBER = "velora-remember";
const LAST_ACTIVE = "velora-last-active";
const ALIVE_COOKIE = "velora-alive"; // session cookie: the browser deletes it on close

export const IDLE_MS = { short: 30 * 60_000, remembered: 30 * 86_400_000 };

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: rules fall back to defaults */ } },
};

export function startSession(remember: boolean) {
  store.set(REMEMBER, remember ? "1" : "0");
  markActive();
  document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

export const isRemembered = () => store.get(REMEMBER) === "1";
export const idleLimit = () => (isRemembered() ? IDLE_MS.remembered : IDLE_MS.short);
export const markActive = () => store.set(LAST_ACTIVE, String(Date.now()));
export const lastActive = () => Number(store.get(LAST_ACTIVE) ?? Date.now());

/** Why this session should end now, if it should. */
export function expiredReason(now = Date.now()): "idle" | "closed" | null {
  if (now - lastActive() > idleLimit()) return "idle";
  if (!isRemembered() && !document.cookie.split("; ").some((c) => c.startsWith(`${ALIVE_COOKIE}=`))) return "closed";
  return null;
}

/** Forget this device's session rules (on sign-out, and whenever the sign-in page opens). */
export function endSession() {
  try { localStorage.removeItem(REMEMBER); localStorage.removeItem(LAST_ACTIVE); } catch { /* ignore */ }
  document.cookie = `${ALIVE_COOKIE}=; path=/; max-age=0`;
}

/** First visit after a sign-in that skipped our form (Google, email link): start a normal session. */
export const hasSession = () => store.get(REMEMBER) !== null;
