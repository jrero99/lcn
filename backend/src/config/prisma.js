// Shared Prisma client instance — import this in services/controllers.
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
})
