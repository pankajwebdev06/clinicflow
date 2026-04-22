import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, usersTable, otpTable, clinicsTable } from "@workspace/db";
import { SendOtpBody, VerifyOtpBody } from "@workspace/api-zod";

const router: IRouter = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mobile, purpose } = parsed.data;

  if (!/^\d{10}$/.test(mobile)) {
    res.status(400).json({ error: "Mobile number must be exactly 10 digits" });
    return;
  }

  if (purpose === "register") {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.mobile, mobile))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Mobile number already registered. Please login." });
      return;
    }
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpTable).values({
    mobile,
    otp,
    purpose,
    expiresAt,
    used: false,
  });

  req.log.info({ mobile, purpose }, "OTP generated (dev mode - check logs)");
  req.log.info({ otp }, "DEV OTP");

  res.json({
    message: `OTP sent to ${mobile}. (Dev mode: ${otp})`,
    expiresInSeconds: 300,
  });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mobile, otp } = parsed.data;

  const validOtp = await db
    .select()
    .from(otpTable)
    .where(
      and(
        eq(otpTable.mobile, mobile),
        eq(otpTable.otp, otp),
        eq(otpTable.used, false),
        gt(otpTable.expiresAt, new Date())
      )
    )
    .limit(1);

  if (validOtp.length === 0) {
    res.status(400).json({ error: "Invalid or expired OTP. Please try again." });
    return;
  }

  await db
    .update(otpTable)
    .set({ used: true })
    .where(eq(otpTable.id, validOtp[0].id));

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.mobile, mobile))
    .limit(1);

  if (users.length === 0) {
    res.status(404).json({ error: "User not found. Please register your clinic or contact admin." });
    return;
  }

  const user = users[0];

  let clinic = null;
  if (user.clinicId) {
    const clinics = await db
      .select()
      .from(clinicsTable)
      .where(eq(clinicsTable.id, user.clinicId))
      .limit(1);
    if (clinics.length > 0) {
      clinic = clinics[0];
    }
  }

  const roleRedirectMap: Record<string, string> = {
    doctor: "doctor_dashboard",
    receptionist: "reception_dashboard",
    admin: "admin_panel",
  };

  const redirectTo = roleRedirectMap[user.role] ?? "doctor_dashboard";
  const token = Buffer.from(`${user.id}:${user.mobile}:${Date.now()}`).toString("base64");

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      clinicId: user.clinicId ?? null,
      clinicCode: clinic?.clinicCode ?? null,
    },
    clinic: clinic ? {
      id: clinic.id,
      clinicCode: clinic.clinicCode,
      clinicName: clinic.clinicName,
      clinicAddress: clinic.clinicAddress,
      doctorName: clinic.doctorName,
      doctorQualification: clinic.doctorQualification,
      mobile: clinic.mobile,
      email: clinic.email ?? null,
      templateId: clinic.templateId ?? null,
      logoUrl: clinic.logoUrl ?? null,
      createdAt: clinic.createdAt.toISOString(),
    } : null,
    redirectTo,
  });
});

export default router;
