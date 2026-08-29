"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  changePassword as changePasswordRequest,
  login as loginRequest,
  logoutAll as logoutAllRequest,
  logout as logoutRequest,
  refreshAccessToken,
} from "./api";
import { getMyAuthorization } from "./authorization-api";
import { clearAuth, isAccessTokenExpired, readAuth } from "./token-store";
import { hasPermission, type AuthorizationSnapshot } from "./permissions";
import { getCurrentProfile, updatePreferences } from "../users/api";
import type { AuthUser, LoginRequest } from "./types";
type Locale = "ar" | "en";
type Theme = "light" | "dark";
type Density = "comfortable" | "compact";
type AuthContextValue = {
  user: AuthUser | null;
  authorization: AuthorizationSnapshot | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  locale: Locale;
  theme: Theme;
  density: Density;
  can: (permission: string) => boolean;
  login: (payload: LoginRequest) => Promise<AuthUser>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  setPreferences: (
    preferences: Partial<{ locale: Locale; theme: Theme; density: Density }>,
  ) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
const localeOf = (value?: string): Locale => (value === "en" ? "en" : "ar");
const themeOf = (value?: string): Theme =>
  value === "dark" ? "dark" : "light";
const densityOf = (value?: string): Density =>
  value === "compact" ? "compact" : "comfortable";
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authorization, setAuthorization] =
    useState<AuthorizationSnapshot | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>("ar");
  const [theme, setTheme] = useState<Theme>("light");
  const [density, setDensity] = useState<Density>("comfortable");
  async function loadAuthorization() {
    try {
      setAuthorization(await getMyAuthorization());
    } catch {
      setAuthorization(null);
    }
  }
  async function loadProfile() {
    try {
      const profile = await getCurrentProfile();
      setLocale(localeOf(profile.preferredLocale));
      setTheme(themeOf(profile.preferredTheme));
      setDensity(densityOf(profile.preferredDensity));
    } catch {
      /* Login response locale remains fallback. */
    }
  }
  async function loadSession(nextUser: AuthUser) {
    setUser(nextUser);
    setLocale(localeOf(nextUser.preferredLocale));
    if (nextUser.requiresPasswordChange) {
      setAuthorization(null);
      return;
    }
    await Promise.all([loadAuthorization(), loadProfile()]);
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
  }, [density, locale, theme]);
  useEffect(() => {
    const restore = async () => {
      const existing = readAuth();
      if (!existing) {
        setLoading(false);
        return;
      }
      try {
        const auth = isAccessTokenExpired(existing)
          ? await refreshAccessToken()
          : existing;
        await loadSession(auth.user);
      } catch {
        clearAuth();
        setUser(null);
        setAuthorization(null);
      } finally {
        setLoading(false);
      }
    };
    void restore();
  }, []);
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setAuthorization(null);
      setLoading(false);
    };
    const handleFocus = async () => {
      const existing = readAuth();
      if (existing && isAccessTokenExpired(existing)) {
        try {
          await refreshAccessToken();
        } catch {
          clearAuth();
          setUser(null);
          setAuthorization(null);
        }
      }
    };
    window.addEventListener("future-gateway:auth-cleared", handleExpired);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("future-gateway:auth-cleared", handleExpired);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authorization,
      isLoading,
      isAuthenticated: Boolean(user),
      locale,
      theme,
      density,
      can: (permission: string) => hasPermission(authorization, permission),
      login: async (payload) => {
        const auth = await loginRequest(payload);
        await loadSession(auth.user);
        return auth.user;
      },
      changePassword: async (currentPassword, newPassword) => {
        const auth = await changePasswordRequest({
          currentPassword,
          newPassword,
        });
        await loadSession(auth.user);
        return auth.user;
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          clearAuth();
        }
      },
      logoutAll: async () => {
        try {
          await logoutAllRequest();
        } finally {
          clearAuth();
        }
      },
      setPreferences: async (preferences) => {
        const profile = await updatePreferences({
          preferredLocale: preferences.locale ?? locale,
          preferredTheme: preferences.theme ?? theme,
          preferredDensity: preferences.density ?? density,
        });
        setLocale(localeOf(profile.preferredLocale));
        setTheme(themeOf(profile.preferredTheme));
        setDensity(densityOf(profile.preferredDensity));
      },
    }),
    [authorization, density, isLoading, locale, theme, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
