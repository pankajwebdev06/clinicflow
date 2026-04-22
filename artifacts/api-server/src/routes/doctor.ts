import { Router } from "express";
import { db, patientsTable, visitsTable, clinicsTable } from "@workspace/db";
import { eq, and, asc, max, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getNextWaiting(clinicId: number) {
  const [next] = await db
    .select()
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, todayDate()), eq(visitsTable.status, "waiting")))
    .orderBy(asc(visitsTable.queuePosition))
    .limit(1);
  return next ?? null;
}

async function startVisit(visitId: number) {
  await db
    .update(visitsTable)
    .set({ status: "in_progress", consultationStart: new Date() })
    .where(eq(visitsTable.id, visitId));
}

async function getVisitWithPatient(visitId: number) {
  const rows = await db
    .select({
      visit: visitsTable,
      patient: patientsTable,
    })
    .from(visitsTable)
    .innerJoin(patientsTable, eq(visitsTable.patientId, patientsTable.id))
    .where(eq(visitsTable.id, visitId))
    .limit(1);
  return rows[0] ?? null;
}

router.get("/doctor/dashboard", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked to this account" });

  const today = todayDate();

  const allVisits = await db
    .select({ visit: visitsTable, patient: patientsTable })
    .from(visitsTable)
    .innerJoin(patientsTable, eq(visitsTable.patientId, patientsTable.id))
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)))
    .orderBy(asc(visitsTable.queuePosition));

  const current = allVisits.find((r) => r.visit.status === "in_progress") ?? null;
  const waiting = allVisits.filter((r) => r.visit.status === "waiting");
  const completed = allVisits.filter((r) => r.visit.status === "completed");
  const cancelled = allVisits.filter((r) => r.visit.status === "cancelled");

  const avgMs =
    completed.length > 0
      ? completed.reduce((sum, r) => {
          const start = r.visit.consultationStart?.getTime() ?? 0;
          const end = r.visit.consultationEnd?.getTime() ?? 0;
          return sum + (end - start);
        }, 0) / completed.length
      : 0;

  const avgMinutes = Math.round(avgMs / 60000);

  let currentWithHistory = null;
  if (current) {
    const history = await db
      .select({ visit: visitsTable })
      .from(visitsTable)
      .where(and(eq(visitsTable.patientId, current.patient.id), eq(visitsTable.status, "completed")))
      .orderBy(sql`${visitsTable.createdAt} DESC`)
      .limit(3);

    currentWithHistory = {
      visit: current.visit,
      patient: current.patient,
      history: history.map((h) => h.visit),
    };
  }

  const nextPatient = waiting[0] ?? null;

  return res.json({
    current: currentWithHistory,
    waitingCount: waiting.length,
    nextPatient: nextPatient ? { visit: nextPatient.visit, patient: nextPatient.patient } : null,
    summary: {
      total: allVisits.length,
      completed: completed.length,
      waiting: waiting.length,
      cancelled: cancelled.length,
      avgConsultationMinutes: avgMinutes,
    },
  });
});

router.post("/doctor/visit/:id/done", requireAuth, async (req: AuthRequest, res) => {
  const visitId = parseInt(req.params.id, 10);
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  await db
    .update(visitsTable)
    .set({ status: "completed", consultationEnd: new Date() })
    .where(and(eq(visitsTable.id, visitId), eq(visitsTable.clinicId, clinicId)));

  const next = await getNextWaiting(clinicId);
  if (next) await startVisit(next.id);

  const nextWithPatient = next ? await getVisitWithPatient(next.id) : null;
  return res.json({ success: true, nextPatient: nextWithPatient });
});

router.post("/doctor/visit/:id/next", requireAuth, async (req: AuthRequest, res) => {
  const visitId = parseInt(req.params.id, 10);
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const [maxPos] = await db
    .select({ val: max(visitsTable.queuePosition) })
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, todayDate())));

  const newPos = (maxPos?.val ?? 0) + 1;

  await db
    .update(visitsTable)
    .set({ status: "waiting", queuePosition: newPos, consultationStart: null })
    .where(and(eq(visitsTable.id, visitId), eq(visitsTable.clinicId, clinicId)));

  const next = await getNextWaiting(clinicId);
  if (next) await startVisit(next.id);

  const nextWithPatient = next ? await getVisitWithPatient(next.id) : null;
  return res.json({ success: true, nextPatient: nextWithPatient });
});

router.post("/doctor/visit/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  const visitId = parseInt(req.params.id, 10);
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  await db
    .update(visitsTable)
    .set({ status: "cancelled" })
    .where(and(eq(visitsTable.id, visitId), eq(visitsTable.clinicId, clinicId)));

  const next = await getNextWaiting(clinicId);
  if (next) await startVisit(next.id);

  const nextWithPatient = next ? await getVisitWithPatient(next.id) : null;
  return res.json({ success: true, nextPatient: nextWithPatient });
});

router.get("/doctor/patient/:id/history", requireAuth, async (req: AuthRequest, res) => {
  const patientId = parseInt(req.params.id, 10);
  const rows = await db
    .select({ visit: visitsTable })
    .from(visitsTable)
    .where(eq(visitsTable.patientId, patientId))
    .orderBy(sql`${visitsTable.createdAt} DESC`)
    .limit(5);

  return res.json({ history: rows.map((r) => r.visit) });
});

router.post("/doctor/demo-seed", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const today = todayDate();
  const existing = await db
    .select()
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)))
    .limit(1);

  if (existing.length > 0) {
    return res.json({ message: "Queue already has patients for today" });
  }

  const demoPatients = [
    { name: "Ramesh Kumar", mobile: "9876543210", age: 45, gender: "male", symptoms: "Fever, headache, body pain", bp: "120/80", weight: "72 kg", temperature: "101.2°F" },
    { name: "Priya Sharma", mobile: "9812345678", age: 32, gender: "female", symptoms: "Cold, sore throat, runny nose", bp: "110/70", weight: "58 kg", temperature: "99.8°F" },
    { name: "Suresh Patel", mobile: "9823456789", age: 60, gender: "male", symptoms: "Chest tightness, shortness of breath", bp: "140/90", weight: "85 kg", temperature: "98.6°F" },
    { name: "Anjali Singh", mobile: "9834567890", age: 28, gender: "female", symptoms: "Stomach pain, nausea, vomiting", temperature: "99.1°F" },
    { name: "Mohan Verma", mobile: "9845678901", age: 52, gender: "male", symptoms: "Back pain, leg weakness", bp: "130/85", weight: "78 kg" },
  ];

  const insertedPatients = [];
  for (let i = 0; i < demoPatients.length; i++) {
    const p = demoPatients[i];
    const upid = `CF${String(clinicId).padStart(3, "0")}${String(i + 1).padStart(4, "0")}${Date.now().toString().slice(-3)}`;
    try {
      const [inserted] = await db
        .insert(patientsTable)
        .values({ clinicId, name: p.name, mobile: p.mobile, age: p.age, gender: p.gender, upid })
        .returning();
      insertedPatients.push({ patient: inserted, demo: p });
    } catch {
      const [existing] = await db
        .select()
        .from(patientsTable)
        .where(and(eq(patientsTable.clinicId, clinicId), eq(patientsTable.name, p.name)))
        .limit(1);
      if (existing) insertedPatients.push({ patient: existing, demo: p });
    }
  }

  for (let i = 0; i < insertedPatients.length; i++) {
    const { patient, demo } = insertedPatients[i];
    await db.insert(visitsTable).values({
      patientId: patient.id,
      clinicId,
      visitDate: today,
      tokenNumber: i + 1,
      queuePosition: i + 1,
      status: i === 0 ? "in_progress" : "waiting",
      symptoms: demo.symptoms,
      bp: demo.bp ?? null,
      weight: demo.weight ?? null,
      temperature: demo.temperature ?? null,
      consultationStart: i === 0 ? new Date() : null,
    });
  }

  return res.json({ message: `Seeded ${insertedPatients.length} demo patients`, count: insertedPatients.length });
});

export default router;
