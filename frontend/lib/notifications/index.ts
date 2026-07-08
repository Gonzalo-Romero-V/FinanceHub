import { isNativeApp } from "@/lib/offline/platform";
import { webPushProvider } from "./web-push";
import { nativePushProvider } from "./native-push";
import type { PushRegistrationResult } from "./types";

export type { PushRegistrationResult } from "./types";

function currentProvider() {
  return isNativeApp() ? nativePushProvider : webPushProvider;
}

export function isPushSupported(): boolean {
  return currentProvider().isSupported();
}

export function registerForPush(token: string): Promise<PushRegistrationResult> {
  return currentProvider().register(token);
}

export function unregisterFromPush(token: string): Promise<void> {
  return currentProvider().unregister(token);
}
