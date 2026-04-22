import { Router } from "express";
import { db, patientsTable, visitsTable } from "@workspace/db";
import { eq, and, max, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/reception/queue", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const today = todayDate();
  const rows = await db
    .select({ visit: visitsTable, patient: patientsTable })
    .from(visitsTable)
    .innerJoin(patientsTable, eq(visitsTable.patientId, patientsTable.id))
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)))
    .orderBy(asc(visitsTable.queuePosition));

  const stats = {
    waiting: rows.filter((r) => r.visit.status === "waiting").length,
    inProgress: rows.filter((r) => r.visit.status === "in_progress").length,
    completed: rows.filter((r) => r.visit.status === "completed").length,
    cancelled: rows.filter((r) => r.visit.status === "cancelled").length,
  };

  return res.json({ queue: rows, stats, total: rows.length });
});

router.get("/reception/search", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const { mobile } = req.query;
  if (!mobile || typeof mobile !== "string") return res.status(400).json({ error: "Mobile required" });

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(and(eq(patientsTable.clinicId, clinicId), eq(patientsTable.mobile, mobile)))
    .limit(1);

  if (!patient) return res.json({ found: false });

  const [lastVisit] = await db
    .select()
    .from(visitsTable)
    .where(eq(visitsTable.patientId, patient.id))
    .orderBy(sql`${visitsTable.createdAt} DESC`)
    .limit(1);

  const today = todayDate();
  const [todayVisit] = await db
    .select()
    .from(visitsTable)
    .where(and(eq(visitsTable.patientId, patient.id), eq(visitsTable.visitDate, today)))
    .limit(1);

  const visitCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(visitsTable)
    .where(eq(visitsTable.patientId, patient.id));

  return res.json({
    found: true,
    patient,
    lastVisit: lastVisit ?? null,
    todayVisit: todayVisit ?? null,
    visitCount: Number(visitCount[0]?.count ?? 0),
  });
});

router.post("/reception/checkin", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const { mobile, name, age, gender, symptoms, bp, weight, temperature, patientId: existingPatientId } = req.body;
  if (!name || !symptoms) return res.status(400).json({ error: "Name and symptoms are required" });

  const today = todayDate();
  let patient: typeof patientsTable.$inferSelect;

  if (existingPatientId) {
    const [existing] = await db
      .select()
      .from(patientsTable)
      .where(and(eq(patientsTable.id, existingPatientId), eq(patientsTable.clinicId, clinicId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Patient not found" });
    patient = existing;

    const [todayVisit] = await db
      .select()
      .from(visitsTable)
      .where(and(eq(visitsTable.patientId, patient.id), eq(visitsTable.visitDate, today)))
      .limit(1);

    if (todayVisit && todayVisit.status !== "cancelled") {
      return res.status(409).json({
        error: "Patient already in today's queue",
        tokenNumber: todayVisit.tokenNumber,
        status: todayVisit.status,
      });
    }
  } else {
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: "Valid 10-digit mobile required" });
    }

    const [existing] = await db
      .select()
      .from(patientsTable)
      .where(and(eq(patientsTable.clinicId, clinicId), eq(patientsTable.mobile, mobile)))
      .limit(1);

    if (existing) {
      patient = existing;
    } else {
      const ts = String(Date.now()).slice(-6);
      const upid = `CF${String(clinicId).padStart(3, "0")}${ts}`;
      const [created] = await db
        .insert(patientsTable)
        .values({ clinicId, name, mobile, age: age ? Number(age) : null, gender: gender ?? null, upid })
        .returning();
      patient = created;
    }
  }

  const [maxToken] = await db
    .select({ val: max(visitsTable.tokenNumber) })
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)));

  const [maxPos] = await db
    .select({ val: max(visitsTable.queuePosition) })
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)));

  const tokenNumber = (maxToken?.val ?? 0) + 1;
  const queuePosition = (maxPos?.val ?? 0) + 1;

  const [visit] = await db
    .insert(visitsTable)
    .values({
      patientId: patient.id,
      clinicId,
      visitDate: today,
      tokenNumber,
      queuePosition,
      status: "waiting",
      symptoms: symptoms ?? null,
      bp: bp ?? null,
      weight: weight ?? null,
      temperature: temperature ?? null,
    })
    .returning();

  return res.status(201).json({
    visit,
    patient,
    tokenNumber,
    message: `Token ${tokenNumber} assigned to ${patient.name}`,
  });
});

router.post("/reception/visit/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  const visitId = parseInt(req.params.id, 10);
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const [visit] = await db.select().from(visitsTable).where(eq(visitsTable.id, visitId)).limit(1);
  if (!visit || visit.clinicId !== clinicId) return res.status(404).json({ error: "Visit not found" });
  if (visit.status === "completed") return res.status(400).json({ error: "Cannot cancel a completed visit" });

  await db.update(visitsTable).set({ status: "cancelled" }).where(eq(visitsTable.id, visitId));
  return res.json({ success: true });
});

router.post("/reception/visit/:id/prescription", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  const visitId = parseInt(req.params.id, 10);
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const { imageData } = req.body;
  if (!imageData) return res.status(400).json({ error: "Image data required" });
  if (!imageData.startsWith("data:image/")) return res.status(400).json({ error: "Invalid image format" });

  const [visit] = await db.select().from(visitsTable).where(eq(visitsTable.id, visitId)).limit(1);
  if (!visit || visit.clinicId !== clinicId) return res.status(404).json({ error: "Visit not found" });

  await db
    .update(visitsTable)
    .set({ prescriptionData: imageData })
    .where(eq(visitsTable.id, visitId));

  return res.json({ success: true, message: "Prescription uploaded successfully" });
});

export default router;
