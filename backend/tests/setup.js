// Global test setup — runs before each test file (setupFiles, not setupFilesAfterFramework)
// Sets env vars required by config/env.js so the app can be imported without a real .env

process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xxxx'
process.env.JWT_EXPIRES_IN = '1h'
process.env.NODE_ENV = 'test'
process.env.PORT = '0'
process.env.CORS_ORIGINS = 'http://localhost:5173'
// GOOGLE_CLIENT_ID intentionally absent to keep Google SSO in "not configured" mode
// TEST_DISABLE_RATE_LIMIT disables all rate limiters so integration tests are not affected
process.env.TEST_DISABLE_RATE_LIMIT = 'true'
