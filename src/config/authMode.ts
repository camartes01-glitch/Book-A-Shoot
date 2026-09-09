/**
 * Temporary development authentication switch for BOOK A SHOOT.
 *
 * DEMO — local/demo accounts only. Do not call Camartes auth APIs.
 * REAL — existing Camartes backend (POST /api/auth/login, signup, me, logout).
 *
 * Change AUTH_MODE below, or set EXPO_PUBLIC_AUTH_MODE, to switch without
 * rewriting Login or Signup. Production/release builds always force REAL.
 */
export type AuthMode = "DEMO" | "REAL";

/** Centralized mode for development. Production builds ignore this and use REAL. */
export const AUTH_MODE: AuthMode = "DEMO";

export const DEMO_CREDENTIALS = {
  email: "demo@bookashoot.com",
  password: "Demo@12345",
  name: "Demo Customer",
  phone: "9999999999",
} as const;

let testOverride: AuthMode | null = null;

export function setAuthModeForTests(mode: AuthMode | null): void {
  testOverride = mode;
}

export function isReleaseBuild(isDev: boolean = typeof __DEV__ === "undefined" ? true : __DEV__): boolean {
  return isDev === false;
}

export function resolveAuthModeFrom(input: {
  configured: AuthMode;
  envMode?: string | null;
  isDev: boolean;
  override?: AuthMode | null;
}): AuthMode {
  if (input.override === "DEMO" || input.override === "REAL") return input.override;
  if (isReleaseBuild(input.isDev)) return "REAL";
  const envMode = (input.envMode ?? "").trim().toUpperCase();
  if (envMode === "DEMO" || envMode === "REAL") return envMode;
  return input.configured;
}

export function resolveAuthMode(): AuthMode {
  return resolveAuthModeFrom({
    configured: AUTH_MODE,
    envMode: process.env.EXPO_PUBLIC_AUTH_MODE,
    isDev: typeof __DEV__ === "undefined" ? true : __DEV__,
    override: testOverride,
  });
}

export function isDemoAuthMode(): boolean {
  return resolveAuthMode() === "DEMO";
}

export function isRealAuthMode(): boolean {
  return resolveAuthMode() === "REAL";
}
