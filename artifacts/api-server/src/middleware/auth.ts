import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: number;
  clinicId?: number;
  userRole?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [userIdStr] = decoded.split(":");
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) throw new Error("invalid token");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(401).json({ error: "User not found" });

    req.userId = user.id;
    req.clinicId = user.clinicId ?? undefined;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
