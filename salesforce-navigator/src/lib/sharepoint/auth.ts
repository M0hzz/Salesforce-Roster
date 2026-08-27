import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from "@azure/msal-browser";
import { getSharePointConfig, GRAPH_SCOPES } from "./config";

let pca: PublicClientApplication | null = null;
let initialized: Promise<PublicClientApplication> | null = null;

function getPca(): Promise<PublicClientApplication> {
  if (initialized) return initialized;
  const cfg = getSharePointConfig();
  pca = new PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: window.location.origin + window.location.pathname,
    },
    cache: {
      // localStorage so the session survives reloads and new tabs.
      cacheLocation: "localStorage",
    },
  });
  initialized = pca.initialize().then(() => pca!);
  return initialized;
}

export function getAccount(): AccountInfo | null {
  if (!pca) return null;
  const active = pca.getActiveAccount();
  if (active) return active;
  const all = pca.getAllAccounts();
  return all[0] ?? null;
}

/** Restore a cached account without any user interaction. */
export async function restoreSession(): Promise<AccountInfo | null> {
  const app = await getPca();
  const account = getAccount();
  if (!account) return null;
  app.setActiveAccount(account);
  return account;
}

export async function signIn(): Promise<AccountInfo> {
  const app = await getPca();
  const result = await app.loginPopup({ scopes: GRAPH_SCOPES, prompt: "select_account" });
  app.setActiveAccount(result.account);
  return result.account;
}

export async function signOut(): Promise<void> {
  const app = await getPca();
  const account = getAccount();
  await app.logoutPopup(account ? { account } : undefined);
}

export async function getToken(): Promise<string> {
  const app = await getPca();
  const account = getAccount();
  if (!account) throw new Error("Not signed in.");
  try {
    const result = await app.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const result = await app.acquireTokenPopup({ scopes: GRAPH_SCOPES, account });
      return result.accessToken;
    }
    throw e;
  }
}
