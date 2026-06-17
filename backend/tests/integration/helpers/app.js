// Re-exports the Express app without starting the server.
// index.js calls app.listen() at module level; we intercept by
// mocking the listen method before the import chain runs.
//
// In Jest ESM mode we use jest.unstable_mockModule to stub prisma
// so the app boots without a real DB connection.
// This helper is imported AFTER all mocks are registered in each test file.
import app from '../../../src/index.js'
export default app
