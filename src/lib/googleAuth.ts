/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import firebaseAppletConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

// In-memory token storage (Do not persist to localStorage as per security requirements)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: { email?: string | null; name?: string | null } | null = null;

// Listeners for token changes
type TokenListener = (token: string | null) => void;
const listeners: TokenListener[] = [];

export function subscribeGoogleAuth(listener: TokenListener) {
  listeners.push(listener);
  listener(cachedAccessToken);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyListeners() {
  listeners.forEach(fn => fn(cachedAccessToken));
}

/**
 * Connect Google Account using Google Identity Services (GSI) Token Client
 * Works smoothly across all preview domains and iframes without auth/unauthorized-domain errors.
 */
export async function connectGoogleSheetsAccount(): Promise<{ accessToken: string; user?: any }> {
  return new Promise((resolve, reject) => {
    const clientId = firebaseAppletConfig.oAuthClientId || (window as any)._GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      reject(new Error('OAuth Client ID কনফিগারেশন পাওয়া যায়নি।'));
      return;
    }

    const initTokenFlow = () => {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services লোড হতে সময় নিচ্ছে। দয়া করে কয়েক সেকেন্ড পর পুনরায় চেষ্টা করুন।'));
        return;
      }

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: WORKSPACE_SCOPES.join(' '),
          prompt: 'consent',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google OAuth Error:', tokenResponse);
              reject(new Error(`Google অথেন্টিকেশন ব্যর্থ: ${tokenResponse.error_description || tokenResponse.error}`));
              return;
            }

            const accessToken = tokenResponse.access_token;
            if (!accessToken) {
              reject(new Error('Google অ্যাক্সেস টোকেন পাওয়া যায়নি।'));
              return;
            }

            cachedAccessToken = accessToken;

            // Fetch user profile info using Google UserInfo API
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                cachedGoogleUser = {
                  email: info.email,
                  name: info.name || info.given_name || info.email?.split('@')[0],
                };
              } else {
                cachedGoogleUser = { email: 'Google Connected' };
              }
            } catch {
              cachedGoogleUser = { email: 'Google Connected' };
            }

            notifyListeners();
            resolve({ accessToken, user: cachedGoogleUser });
          },
          error_callback: (err: any) => {
            console.error('GSI Client Error:', err);
            reject(new Error(err.message || 'Google লগইন সম্পন্ন করা যায়নি।'));
          }
        });

        client.requestAccessToken();
      } catch (err: any) {
        console.error('GSI Init Error:', err);
        reject(err);
      }
    };

    // If script is already ready
    if ((window as any).google?.accounts?.oauth2) {
      initTokenFlow();
    } else {
      // Poll or wait for script load
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(interval);
          initTokenFlow();
        } else if (attempts > 25) {
          clearInterval(interval);
          reject(new Error('Google Identity Services লোড করা সম্ভব হয়নি।'));
        }
      }, 200);
    }
  });
}

/**
 * Get the currently cached in-memory Google access token
 */
export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Check if Google account is currently authenticated with token
 */
export function isGoogleConnected(): boolean {
  return !!cachedAccessToken;
}

/**
 * Get connected Google user info
 */
export function getConnectedGoogleUser() {
  return cachedGoogleUser;
}

/**
 * Clear cached token on sign-out
 */
export function disconnectGoogleAccount() {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyListeners();

  if (tokenToRevoke && (window as any).google?.accounts?.oauth2?.revoke) {
    try {
      (window as any).google.accounts.oauth2.revoke(tokenToRevoke, () => {
        console.log('Google OAuth token revoked');
      });
    } catch (e) {
      console.warn('Token revoke warning:', e);
    }
  }
}
