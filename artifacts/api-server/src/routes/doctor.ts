import { Router } from "express";
import { db, patientsTable, visitsTable, clinicsTable, usersTable, prescriptionTemplatesTable } from "@workspace/db";
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
    .select({ visit: visitsTable, patient: patientsTable })
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

router.get("/doctor/staff", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const staff = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.clinicId, clinicId)));

  return res.json({ staff });
});

router.post("/doctor/staff", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const { mobile, name, role } = req.body;
  if (!mobile || !role) return res.status(400).json({ error: "Mobile and role are required" });
  if (!["receptionist", "admin"].includes(role)) return res.status(400).json({ error: "Role must be receptionist or admin" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Mobile must be 10 digits" });

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile)).limit(1);

  if (existing) {
    if (existing.clinicId && existing.clinicId !== clinicId) {
      return res.status(409).json({ error: "This mobile is registered with another clinic" });
    }
    const [updated] = await db
      .update(usersTable)
      .set({ clinicId, role, name: name || existing.name })
      .where(eq(usersTable.id, existing.id))
      .returning();
    return res.json({ staff: updated, created: false });
  }

  const [created] = await db
    .insert(usersTable)
    .values({ mobile, name: name || mobile, role, clinicId })
    .returning();

  return res.status(201).json({ staff: created, created: true });
});

router.delete("/doctor/staff/:id", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  const staffId = parseInt(req.params.id, 10);
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, staffId)).limit(1);
  if (!target || target.clinicId !== clinicId) return res.status(404).json({ error: "Staff not found" });
  if (target.role === "doctor") return res.status(400).json({ error: "Cannot remove doctor from clinic" });

  await db.update(usersTable).set({ clinicId: null }).where(eq(usersTable.id, staffId));
  return res.json({ success: true });
});

router.put("/doctor/clinic", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const { clinicName, clinicAddress, doctorName, doctorQualification, email } = req.body;
  const [updated] = await db
    .update(clinicsTable)
    .set({
      ...(clinicName && { clinicName }),
      ...(clinicAddress && { clinicAddress }),
      ...(doctorName && { doctorName }),
      ...(doctorQualification && { doctorQualification }),
      ...(email !== undefined && { email }),
    })
    .where(eq(clinicsTable.id, clinicId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Clinic not found" });
  return res.json({ clinic: updated });
});

router.get("/doctor/clinic", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, clinicId)).limit(1);
  if (!clinic) return res.status(404).json({ error: "Clinic not found" });

  const templates = await db.select().from(prescriptionTemplatesTable);
  return res.json({ clinic, templates });
});

router.post("/doctor/demo-seed", requireAuth, async (req: AuthRequest, res) => {
  const clinicId = req.clinicId;
  if (!clinicId) return res.status(400).json({ error: "No clinic linked" });

  const today = todayDate();

  const [maxPos] = await db
    .select({ val: max(visitsTable.queuePosition) })
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)));

  const basePosition = (maxPos?.val ?? 0) + 1;

  const [maxToken] = await db
    .select({ val: max(visitsTable.tokenNumber) })
    .from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today)));

  const baseToken = (maxToken?.val ?? 0) + 1;

  const demoPatients = [
    { name: "Ramesh Kumar", mobile: "9876543210", age: 45, gender: "male", symptoms: "Fever, headache, body pain since 3 days", bp: "120/80", weight: "72 kg", temperature: "101.2°F" },
    { name: "Priya Sharma", mobile: "9812345678", age: 32, gender: "female", symptoms: "Cold, sore throat, runny nose", bp: "110/70", weight: "58 kg", temperature: "99.8°F" },
    { name: "Suresh Patel", mobile: "9823456789", age: 60, gender: "male", symptoms: "Chest tightness, shortness of breath on exertion", bp: "140/90", weight: "85 kg", temperature: "98.6°F" },
    { name: "Anjali Singh", mobile: "9834567890", age: 28, gender: "female", symptoms: "Stomach pain, nausea, vomiting since morning", temperature: "99.1°F" },
    { name: "Mohan Verma", mobile: "9845678901", age: 52, gender: "male", symptoms: "Lower back pain, leg weakness", bp: "130/85", weight: "78 kg" },
    { name: "Kavita Rao", mobile: "9856789012", age: 38, gender: "female", symptoms: "Migraine, sensitivity to light, blurred vision", bp: "118/76", weight: "61 kg", temperature: "98.4°F" },
    { name: "Deepak Joshi", mobile: "9867890123", age: 67, gender: "male", symptoms: "Knee joint pain, difficulty walking, swelling", bp: "145/95", weight: "88 kg", temperature: "98.9°F" },
    { name: "Sneha Gupta", mobile: "9878901234", age: 24, gender: "female", symptoms: "Skin rash, itching on arms and neck", temperature: "98.2°F", weight: "52 kg" },
    { name: "Rajesh Mishra", mobile: "9889012345", age: 41, gender: "male", symptoms: "Cough, wheezing, breathlessness — asthma follow-up", bp: "122/78", weight: "69 kg" },
    { name: "Sunita Devi", mobile: "9890123456", age: 55, gender: "female", symptoms: "Dizziness, fatigue, thyroid check-up", bp: "128/82", weight: "66 kg", temperature: "98.7°F" },
    { name: "Arun Tiwari", mobile: "9901234567", age: 33, gender: "male", symptoms: "Eye irritation, redness, watery discharge", temperature: "98.5°F" },
    { name: "Meena Pandey", mobile: "9012345678", age: 48, gender: "female", symptoms: "Diabetes follow-up, blood sugar monitoring, foot pain", bp: "132/88", weight: "74 kg", temperature: "98.6°F" },
  ];

  const insertedPatients = [];
  for (let i = 0; i < demoPatients.length; i++) {
    const p = demoPatients[i];
    const upid = `CF${String(clinicId).padStart(3, "0")}${String(Date.now()).slice(-6)}${String(i).padStart(2, "0")}`;
    try {
      const [inserted] = await db
        .insert(patientsTable)
        .values({ clinicId, name: p.name, mobile: p.mobile, age: p.age, gender: p.gender, upid })
        .returning();
      insertedPatients.push({ patient: inserted, demo: p });
    } catch {
      const [existingPatient] = await db
        .select()
        .from(patientsTable)
        .where(and(eq(patientsTable.clinicId, clinicId), eq(patientsTable.mobile, p.mobile)))
        .limit(1);
      if (existingPatient) insertedPatients.push({ patient: existingPatient, demo: p });
    }
  }

  let seededCount = 0;
  const hasInProgress = await db.select().from(visitsTable)
    .where(and(eq(visitsTable.clinicId, clinicId), eq(visitsTable.visitDate, today), eq(visitsTable.status, "in_progress")))
    .limit(1);

  for (let i = 0; i < insertedPatients.length; i++) {
    const { patient, demo } = insertedPatients[i];
    const alreadyVisiting = await db.select().from(visitsTable)
      .where(and(eq(visitsTable.patientId, patient.id), eq(visitsTable.visitDate, today)))
      .limit(1);
    if (alreadyVisiting.length > 0) continue;

    const pos = basePosition + i;
    const tok = baseToken + i;
    const isFirst = i === 0 && hasInProgress.length === 0;

    await db.insert(visitsTable).values({
      patientId: patient.id,
      clinicId,
      visitDate: today,
      tokenNumber: tok,
      queuePosition: pos,
      status: isFirst ? "in_progress" : "waiting",
      symptoms: demo.symptoms,
      bp: demo.bp ?? null,
      weight: demo.weight ?? null,
      temperature: demo.temperature ?? null,
      consultationStart: isFirst ? new Date() : null,
    });
    seededCount++;
  }

  return res.json({ message: `Added ${seededCount} new patients to today's queue`, count: seededCount });
});

export default router;
