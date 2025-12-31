/**
 * Learnworlds API Service
 *
 * Integrates with Learnworlds to verify member existence.
 * Used for member authentication flow.
 */

import { ENV } from "../_core/env";

interface LearnworldsUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  created: string;
  tags?: string[];
}

interface LearnworldsApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    totalPages: number;
    totalResults: number;
  };
}

// Token cache
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get Learnworlds API status (for debugging)
 */
export function getLearnworldsStatus() {
  return {
    isConfigured: !!(ENV.learnworldsClientId && ENV.learnworldsClientSecret && ENV.learnworldsSchoolId),
    schoolId: ENV.learnworldsSchoolId || null,
    hasClientId: !!ENV.learnworldsClientId,
    hasClientSecret: !!ENV.learnworldsClientSecret,
  };
}

/**
 * Get OAuth access token from Learnworlds
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (accessToken && tokenExpiresAt > Date.now()) {
    return accessToken;
  }

  if (!ENV.learnworldsClientId || !ENV.learnworldsClientSecret) {
    throw new Error("Learnworlds credentials not configured");
  }

  const schoolId = ENV.learnworldsSchoolId || "mojitax";
  const tokenUrl = `https://${schoolId}.learnworlds.com/admin/api/oauth2/access_token`;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: ENV.learnworldsClientId,
        client_secret: ENV.learnworldsClientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

    console.log("[Learnworlds] Access token obtained successfully");
    return accessToken!;
  } catch (error: any) {
    console.error("[Learnworlds] Failed to get access token:", error.message);
    throw error;
  }
}

/**
 * Make authenticated API request to Learnworlds
 */
async function learnworldsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const schoolId = ENV.learnworldsSchoolId || "mojitax";
  const baseUrl = `https://${schoolId}.learnworlds.com/admin/api/v2`;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Lw-Client": ENV.learnworldsClientId,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    // If token expired, clear cache and retry once
    if (response.status === 401) {
      accessToken = null;
      tokenExpiresAt = 0;
      console.log("[Learnworlds] Token expired, retrying...");
      return learnworldsRequest(endpoint, options);
    }

    throw new Error(`Learnworlds API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Look up a user by email in Learnworlds
 */
export async function getUserByEmail(email: string): Promise<LearnworldsUser | null> {
  const status = getLearnworldsStatus();
  if (!status.isConfigured) {
    console.warn("[Learnworlds] API not configured, skipping user lookup");
    return null;
  }

  try {
    // URL encode the email for the query
    const encodedEmail = encodeURIComponent(email);
    const response = await learnworldsRequest<LearnworldsApiResponse<LearnworldsUser[]>>(
      `/users?email=${encodedEmail}`
    );

    if (response.data && response.data.length > 0) {
      const user = response.data[0];
      console.log(`[Learnworlds] Found user: ${user.email} (id: ${user.id})`);
      return user;
    }

    console.log(`[Learnworlds] No user found with email: ${email}`);
    return null;
  } catch (error: any) {
    console.error("[Learnworlds] Error looking up user:", error.message);
    throw error;
  }
}

/**
 * Check if a user exists in Learnworlds (returns boolean)
 */
export async function userExists(email: string): Promise<boolean> {
  try {
    const user = await getUserByEmail(email);
    return user !== null && user.is_active;
  } catch (error) {
    // If API fails, we can't verify - don't allow login
    return false;
  }
}

/**
 * Get user's full name from Learnworlds
 */
export async function getUserName(email: string): Promise<string | null> {
  try {
    const user = await getUserByEmail(email);
    if (!user) return null;

    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get user's tags from Learnworlds (useful for role assignment)
 */
export async function getUserTags(email: string): Promise<string[]> {
  try {
    const user = await getUserByEmail(email);
    return user?.tags || [];
  } catch (error) {
    return [];
  }
}
