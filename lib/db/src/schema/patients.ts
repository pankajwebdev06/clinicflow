import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  mobile: text("mobile"),
  age: integer("age"),
  gender: text("gender"),
  upid: text("upid").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;

export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  clinicId: integer("clinic_id").notNull(),
  visitDate: text("visit_date").notNull(),
  tokenNumber: integer("token_number").notNull(),
  queuePosition: integer("queue_position").notNull(),
  status: text("status").notNull().default("waiting"),
  symptoms: text("symptoms"),
  bp: text("bp"),
  weight: text("weight"),
  temperature: text("temperature"),
  notes: text("notes"),
  consultationStart: timestamp("consultation_start"),
  consultationEnd: timestamp("consultation_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVisitSchema = createInsertSchema(visitsTable).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
