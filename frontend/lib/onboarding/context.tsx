"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/context";
import {
  getUserSettings,
  markOnboardingSeen as apiMarkSeen,
  resetOnboarding as apiReset,
} from "@/lib/api/user-settings";

interface OnboardingContextType {
  /** true una vez que se cargó el estado real desde el backend (evita parpadeos). */
  loaded: boolean;
  isSeen: (key: string) => boolean;
  markSeen: (key: string) => void;
  resetKeys: (keys: string[]) => Promise<void>;
  resetAll: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType>({
  loaded: false,
  isSeen: () => true,
  markSeen: () => {},
  resetKeys: async () => {},
  resetAll: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    getUserSettings(token)
      .then((res) => setSeen(res.data.onboarding_seen ?? {}))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [token]);

  const isSeen = useCallback((key: string) => seen[key] === true, [seen]);

  const markSeen = useCallback(
    (key: string) => {
      setSeen((prev) => ({ ...prev, [key]: true }));
      if (token) void apiMarkSeen(token, [key]).catch(() => {});
    },
    [token],
  );

  const resetKeys = useCallback(
    async (keys: string[]) => {
      setSeen((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
      if (token) await apiReset(token, keys).catch(() => {});
    },
    [token],
  );

  const resetAll = useCallback(async () => {
    setSeen({});
    if (token) await apiReset(token).catch(() => {});
  }, [token]);

  return (
    <OnboardingContext.Provider value={{ loaded, isSeen, markSeen, resetKeys, resetAll }}>
      {children}
    </OnboardingContext.Provider>
  );
}
