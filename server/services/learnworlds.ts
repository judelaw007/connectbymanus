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
    isConfigured: !!(
      ENV.learnworldsClientId &&
      ENV.learnworldsClientSecret &&
      ENV.learnworldsSchoolId
    ),
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
        "Lw-Client": ENV.learnworldsClientId,
      },
      body: JSON.stringify({
        client_id: ENV.learnworldsClientId,
        client_secret: ENV.learnworldsClientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get access token: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    accessToken = data.access_token || data.tokenData?.access_token;
    if (!accessToken) {
      console.error(
        "[Learnworlds] Token response missing access_token:",
        JSON.stringify(data).slice(0, 200)
      );
      throw new Error("Token response did not contain access_token");
    }
    // Set expiry 5 minutes before actual expiry for safety
    const expiresIn = data.expires_in || data.tokenData?.expires_in || 3600;
    tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

    console.log("[Learnworlds] Access token obtained successfully");
    return accessToken;
  } catch (error: any) {
    console.error("[Learnworlds] Failed to get access token:", error.message);
    throw error;
  }
}

/**
 * Make authenticated API request to Learnworlds
 */
async function learnworldsRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const token = await getAccessToken();
  const schoolId = ENV.learnworldsSchoolId || "mojitax";
  const baseUrl = `https://${schoolId}.learnworlds.com/admin/api/v2`;

  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Lw-Client": ENV.learnworldsClientId,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    // If token expired, clear cache and retry once (not infinitely)
    if (response.status === 401 && !_retried) {
      accessToken = null;
      tokenExpiresAt = 0;
      console.log("[Learnworlds] Token expired, retrying...");
      return learnworldsRequest(endpoint, options, true);
    }

    throw new Error(
      `Learnworlds API error: ${response.status} ${url} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * Fetch all pages from a paginated Learnworlds endpoint
 */
async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  const maxPages = 20; // Safety limit

  while (page <= maxPages) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await learnworldsRequest<LearnworldsApiResponse<T[]>>(
      `${endpoint}${separator}page=${page}`
    );

    const items = response.data || [];
    allItems.push(...items);

    // Stop if no more pages
    if (
      !response.meta ||
      page >= response.meta.totalPages ||
      items.length === 0
    ) {
      break;
    }
    page++;
  }

  return allItems;
}

/**
 * Look up a user by email in Learnworlds
 */
export async function getUserByEmail(
  email: string
): Promise<LearnworldsUser | null> {
  const status = getLearnworldsStatus();
  if (!status.isConfigured) {
    console.warn("[Learnworlds] API not configured, skipping user lookup");
    return null;
  }

  try {
    // LearnWorlds uses email as a path parameter to get a single user
    const encodedEmail = encodeURIComponent(email);
    const user = await learnworldsRequest<LearnworldsUser>(
      `/users/${encodedEmail}`
    );

    if (user && user.email) {
      console.log(`[Learnworlds] Found user: ${user.email} (id: ${user.id})`);
      return user;
    }

    console.log(`[Learnworlds] No user found with email: ${email}`);
    return null;
  } catch (error: any) {
    // 404 means user doesn't exist — not a real error
    if (error.message?.includes("404")) {
      console.log(`[Learnworlds] No user found with email: ${email}`);
      return null;
    }
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

// ============= Catalog API (Courses, Bundles, Subscriptions) =============

interface LearnworldsCourse {
  id: string;
  title: string;
  description?: string;
  // LearnWorlds uses 'access' field with values: draft, paid, free, coming_soon, enrollment_closed, private
  access?: string;
}

interface LearnworldsBundle {
  id: string;
  title: string;
  description?: string;
}

interface LearnworldsSubscription {
  id: string;
  // LearnWorlds may return 'name' or 'title' for subscription plans
  name?: string;
  title?: string;
  description?: string;
}

/**
 * Get all published courses from Learnworlds (paginated)
 */
export async function getCourses(): Promise<{ id: string; title: string }[]> {
  const status = getLearnworldsStatus();
  if (!status.isConfigured) return [];

  try {
    const courses = await fetchAllPages<LearnworldsCourse>("/courses");
    console.log(`[Learnworlds] Fetched ${courses.length} courses`);
    return courses
      .filter(c => c.access !== "draft")
      .map(c => ({ id: c.id, title: c.title }));
  } catch (error: any) {
    console.error("[Learnworlds] Error fetching courses:", error.message);
    return [];
  }
}

/**
 * Get all bundles from Learnworlds (paginated)
 */
export async function getBundles(): Promise<{ id: string; title: string }[]> {
  const status = getLearnworldsStatus();
  if (!status.isConfigured) return [];

  try {
    const bundles = await fetchAllPages<LearnworldsBundle>("/bundles");
    console.log(`[Learnworlds] Fetched ${bundles.length} bundles`);
    return bundles.map(b => ({ id: b.id, title: b.title }));
  } catch (error: any) {
    console.error("[Learnworlds] Error fetching bundles:", error.message);
    return [];
  }
}

/**
 * Get all subscriptions from Learnworlds (paginated)
 */
export async function getSubscriptions(): Promise<
  { id: string; title: string }[]
> {
  const status = getLearnworldsStatus();
  if (!status.isConfigured) return [];

  try {
    const subs = await fetchAllPages<LearnworldsSubscription>(
      "/subscription-plans"
    );
    console.log(`[Learnworlds] Fetched ${subs.length} subscription plans`);
    return subs.map(s => ({
      id: s.id,
      title: s.title || s.name || s.id,
    }));
  } catch (error: any) {
    console.error("[Learnworlds] Error fetching subscriptions:", error.message);
    return [];
  }
}

/**
 * Get a user's enrolled courses by email
 */
export async function getUserCourses(email: string): Promise<string[]> {
  const status = getLearnworldsStatus();
  if (!status.isConfigured) return [];

  try {
    const user = await getUserByEmail(email);
    if (!user) return [];

    const response = await learnworldsRequest<
      LearnworldsApiResponse<{ id: string }[]>
    >(`/users/${user.id}/courses`);
    return (response.data || []).map(c => c.id);
  } catch (error: any) {
    console.error("[Learnworlds] Error fetching user courses:", error.message);
    return [];
  }
}
