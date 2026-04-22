import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clinicsTable = pgTable("clinics", {
  id: serial("id").primaryKey(),
  clinicCode: text("clinic_code").notNull().unique(),
  clinicName: text("clinic_name").notNull(),
  clinicAddress: text("clinic_address").notNull(),
  doctorName: text("doctor_name").notNull(),
  doctorQualification: text("doctor_qualification").notNull(),
  mobile: text("mobile").notNull().unique(),
  email: text("email"),
  templateId: integer("template_id"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClinicSchema = createInsertSchema(clinicsTable).omit({ id: true, createdAt: true });
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinicsTable.$inferSelect;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  role: text("role").notNull().default("doctor"),
  clinicId: integer("clinic_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const otpTable = pgTable("otps", {
  id: serial("id").primaryKey(),
  mobile: text("mobile").notNull(),
  otp: text("otp").notNull(),
  purpose: text("purpose").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prescriptionTemplatesTable = pgTable("prescription_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  previewColor: text("preview_color").notNull(),
  headerStyle: text("header_style").notNull(),
  footerStyle: text("footer_style").notNull(),
  bodyLayout: text("body_layout").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
});

export type PrescriptionTemplate = typeof prescriptionTemplatesTable.$inferSelect;
