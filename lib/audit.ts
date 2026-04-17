import { prisma } from "./prisma";

export async function recordLog(userId: string, action: string, target?: string, details?: string, ipAddress?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
