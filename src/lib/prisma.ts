import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** mtime de node_modules/.prisma/client — muda apos `prisma generate` */
  prismaClientMtimeMs?: number;
};

function prismaGeneratedClientMtimeMs(): number {
  try {
    const clientJs = path.join(process.cwd(), "node_modules", ".prisma", "client", "index.js");
    return fs.statSync(clientJs).mtimeMs;
  } catch {
    return 0;
  }
}

const clientMtime = prismaGeneratedClientMtimeMs();

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  const stored = globalForPrisma.prismaClientMtimeMs;
  if (stored === undefined || stored !== clientMtime) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientMtimeMs = clientMtime;
}
