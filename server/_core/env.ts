export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  // Supabase - using VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY directly in db.ts
  supabaseUrl: process.env.VITE_SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey:
    process.env.BUILT_IN_FORGE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.API_Key ||
    "",

  // Email configuration
  sendGridApiKey: process.env.SENDGRID_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "no-reply@mojitax.com",

  // TEST_MODE - redirects all emails to test recipient for safe testing
  isTestMode: process.env.TEST_MODE === "true",
  testEmailRecipient: process.env.TEST_EMAIL_RECIPIENT ?? "",

  // Admin password (for password-based admin login)
  adminPassword: process.env.ADMIN_PASSWORD ?? "",

  // Learnworlds (member authentication)
  learnworldsClientId: process.env.LEARNWORLDS_CLIENT_ID ?? "",
  learnworldsClientSecret: process.env.LEARNWORLDS_CLIENT_SECRET ?? "",
  learnworldsSchoolId: process.env.LEARNWORLDS_SCHOOL_ID ?? "",
  // Replit may use these alternative secret names
  learnworldsSchoolUrl: process.env.LEARNWORLDS_SCHOOL_URL ?? "",
  learnworldsApiUrl: process.env.LEARNWORLDS_API_URL ?? "",
};
