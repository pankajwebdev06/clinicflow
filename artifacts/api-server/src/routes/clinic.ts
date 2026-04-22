import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, clinicsTable, usersTable, otpTable, prescriptionTemplatesTable } from "@workspace/db";
import {
  RegisterClinicBody,
  GetClinicParams,
  UpdateClinicTemplateParams,
  UpdateClinicTemplateBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateClinicCode(doctorName: string): string {
  const namePart = doctorName.split(" ")[0].toUpperCase().substring(0, 6);
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `${namePart}${randomPart}`;
}

router.post("/clinic/register", async (req, res): Promise<void> => {
  const parsed = RegisterClinicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clinicName, clinicAddress, doctorName, doctorQualification, mobile, email, templateId, otp } = parsed.data;

  if (!/^\d{10}$/.test(mobile)) {
    res.status(400).json({ error: "Mobile number must be exactly 10 digits" });
    return;
  }

  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.mobile, mobile))
    .limit(1);

  if (existingUser.length > 0) {
    res.status(409).json({ error: "Mobile number already registered. Please login." });
    return;
  }

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
    res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
    return;
  }

  await db
    .update(otpTable)
    .set({ used: true })
    .where(eq(otpTable.id, validOtp[0].id));

  const clinicCode = generateClinicCode(doctorName);

  const [clinic] = await db
    .insert(clinicsTable)
    .values({
      clinicCode,
      clinicName,
      clinicAddress,
      doctorName,
      doctorQualification,
      mobile,
      email: email ?? null,
      templateId: templateId ?? null,
    })
    .returning();

  const [user] = await db
    .insert(usersTable)
    .values({
      name: doctorName,
      mobile,
      role: "doctor",
      clinicId: clinic.id,
    })
    .returning();

  const token = Buffer.from(`${user.id}:${user.mobile}:${Date.now()}`).toString("base64");

  req.log.info({ clinicCode, clinicId: clinic.id }, "Clinic registered");

  res.status(201).json({
    clinic: {
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
    },
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      clinicId: user.clinicId ?? null,
      clinicCode: clinic.clinicCode,
    },
    token,
    clinicCode,
  });
});

router.get("/clinic/:clinicId", async (req, res): Promise<void> => {
  const params = GetClinicParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [clinic] = await db
    .select()
    .from(clinicsTable)
    .where(eq(clinicsTable.id, params.data.clinicId))
    .limit(1);

  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }

  res.json({
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
  });
});

router.patch("/clinic/:clinicId/template", async (req, res): Promise<void> => {
  const params = UpdateClinicTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateClinicTemplateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [clinic] = await db
    .update(clinicsTable)
    .set({ templateId: body.data.templateId })
    .where(eq(clinicsTable.id, params.data.clinicId))
    .returning();

  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }

  res.json({
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
  });
});

router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db.select().from(prescriptionTemplatesTable);
  res.json(templates);
});

export default router;
