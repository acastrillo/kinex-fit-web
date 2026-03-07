export interface GuestUsage {
  savesUsed: number;
  aiUsed: number;
  startedAt: string;
  updatedAt: string;
}

export const GUEST_SAVE_LIMIT = 3;
export const GUEST_AI_LIMIT = 1;

const GUEST_USAGE_STORAGE_KEY = "kinex_guest_usage";

function createDefaultGuestUsage(): GuestUsage {
  const now = new Date().toISOString();
  return {
    savesUsed: 0,
    aiUsed: 0,
    startedAt: now,
    updatedAt: now,
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getGuestUsage(): GuestUsage {
  if (!isBrowser()) {
    return createDefaultGuestUsage();
  }

  try {
    const raw = window.localStorage.getItem(GUEST_USAGE_STORAGE_KEY);
    if (!raw) {
      return createDefaultGuestUsage();
    }

    const parsed = JSON.parse(raw) as Partial<GuestUsage>;
    const fallback = createDefaultGuestUsage();

    return {
      savesUsed: Number.isFinite(parsed.savesUsed) ? Number(parsed.savesUsed) : fallback.savesUsed,
      aiUsed: Number.isFinite(parsed.aiUsed) ? Number(parsed.aiUsed) : fallback.aiUsed,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : fallback.startedAt,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return createDefaultGuestUsage();
  }
}

export function setGuestUsage(usage: GuestUsage) {
  if (!isBrowser()) return;
  window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(usage));
}

export function getGuestSaveRemaining() {
  return Math.max(0, GUEST_SAVE_LIMIT - getGuestUsage().savesUsed);
}

export function canGuestSaveMore() {
  return getGuestSaveRemaining() > 0;
}

export function incrementGuestSave() {
  const current = getGuestUsage();
  const next: GuestUsage = {
    ...current,
    savesUsed: current.savesUsed + 1,
    updatedAt: new Date().toISOString(),
  };

  setGuestUsage(next);
  return next;
}

export function getGuestAiRemaining() {
  return Math.max(0, GUEST_AI_LIMIT - getGuestUsage().aiUsed);
}

export function canGuestUseAI() {
  return getGuestAiRemaining() > 0;
}

export function incrementGuestAI() {
  const current = getGuestUsage();
  const next: GuestUsage = {
    ...current,
    aiUsed: Math.min(GUEST_AI_LIMIT, current.aiUsed + 1),
    updatedAt: new Date().toISOString(),
  };

  setGuestUsage(next);
  return next;
}

export function syncGuestAIUsage(aiUsed: number) {
  const current = getGuestUsage();
  const next: GuestUsage = {
    ...current,
    aiUsed: Math.max(0, Math.min(GUEST_AI_LIMIT, aiUsed)),
    updatedAt: new Date().toISOString(),
  };

  setGuestUsage(next);
  return next;
}
