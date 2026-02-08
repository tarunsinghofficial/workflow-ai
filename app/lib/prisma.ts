import { PrismaClient } from '@prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

// Extend global to hold prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with Neon HTTP adapter
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || typeof connectionString !== 'string') {
    throw new Error('DATABASE_URL environment variable is not set or invalid');
  }

  // PrismaNeonHttp expects the connection string, not the neon() client
  const adapter = new PrismaNeonHttp(connectionString);

  return new PrismaClient({ adapter });
}

// Lazy initialization with caching
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();

  // Cache in development to avoid too many connections
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();
