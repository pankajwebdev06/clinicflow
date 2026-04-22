import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, Building2, FileText, Users, ChevronRight, Check, Save, Plus, Trash2,
  Loader2, UserCheck, ShieldCheck, Phone, Mail, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiCall<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return fetch(`${BASE}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  });
}

const ROLE_OPTIONS = [
  { value: "receptionist", label: "Receptionist", description: "Manages patient queue & appointments", icon: UserCheck, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "admin", label: "Admin", description: "Full access to clinic settings & reports", icon: ShieldCheck, color: "bg-purple-100 text-purple-700 border-purple-200" },
];

interface Template { id: number; name: string; description: string; previewColor: string; isDefault: boolean; }
interface Clinic { id: number; clinicName: string; clinicAddress: string; doctorName: string; doctorQualification: string; mobile: string; email: string | null; templateId: number | null; }
interface StaffUser { id: number; name: string; mobile: string; role: string; clinicId: number | null; }

function ClinicTab({ token, clinic, templates, onSaved }: { token: string; clinic: Clinic; templates: Template[]; onSaved: () => void }) {
  const [form, setForm] = useState({ clinicName: clinic.clinicName, clinicAddress: clinic.clinicAddress, doctorName: clinic.doctorName, doctorQualification: clinic.doctorQualification, email: clinic.email ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      await apiCall("/doctor/clinic", token, { method: "PUT", body: JSON.stringify(form) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Clinic Name</label>
        <Input value={form.clinicName} onChange={e => setForm(f => ({ ...f, clinicName: e.target.value }))} className="h-11" />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Clinic Address</label>
        <Input value={form.clinicAddress} onChange={e => setForm(f => ({ ...f, clinicAddress: e.target.value }))} className="h-11" />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Doctor Name</label>
        <Input value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))} className="h-11" />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Qualification</label>
        <Input value={form.doctorQualification} onChange={e => setForm(f => ({ ...f, doctorQualification: e.target.value }))} className="h-11" placeholder="MBBS, MD, etc." />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Email (optional)</label>
        <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-11" type="email" placeholder="doctor@clinic.com" />
      </div>
      {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{error}</p>}
      <Button onClick={save} disabled={saving} className="w-full h-11">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Save className="w-4 h-4 mr-2" />}
        {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

function TemplateTab({ token, clinic, templates, onSaved }: { token: string; clinic: Clinic; templates: Template[]; onSaved: () => void }) {
  const [selected, setSelected] = useState<number | null>(clinic.templateId);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/clinic/${clinic.id}/template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateId: selected }),
      });
      onSaved();
    } catch {}
    setSaving(false);
  };

  const sampleColors = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#9333ea", "#b45309", "#dc2626"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose a layout for your printed prescriptions.</p>
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t, i) => {
          const color = sampleColors[i % sampleColors.length];
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${isSelected ? "border-primary shadow-md" : "border-border hover:border-primary/40"}`}
            >
              <div className="h-20 flex flex-col" style={{ background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)` }}>
                <div className="h-5 w-full" style={{ background: color }} />
                <div className="flex-1 p-1.5 space-y-1">
                  <div className="h-1.5 rounded-full bg-current opacity-20 w-3/4" />
                  <div className="h-1 rounded-full bg-current opacity-10 w-1/2" />
                  <div className="h-1 rounded-full bg-current opacity-10 w-2/3" />
                </div>
              </div>
              <div className="p-2 bg-card">
                <p className="text-xs font-semibold truncate">{t.name}</p>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <Button onClick={save} disabled={saving || selected === clinic.templateId} className="w-full h-11">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        Apply Layout
      </Button>
    </div>
  );
}

function StaffTab({ token, clinicId }: { token: string; clinicId: number }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ mobile: "", name: "", role: "receptionist" });
  const [adding, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ staff: StaffUser[] }>({
    queryKey: ["clinic-staff", clinicId],
    queryFn: () => apiCall("/doctor/staff", token),
  });

  const addStaff = async () => {
    if (!addForm.mobile || !/^\d{10}$/.test(addForm.mobile)) { setAddError("Enter a valid 10-digit mobile number"); return; }
    setSaving(true); setAddError("");
    try {
      await apiCall("/doctor/staff", token, { method: "POST", body: JSON.stringify(addForm) });
      setAddForm({ mobile: "", name: "", role: "receptionist" });
      setShowAdd(false);
      refetch();
    } catch (e: any) { setAddError(e.message); }
    setSaving(false);
  };

  const removeStaff = async (id: number) => {
    try {
      await apiCall(`/doctor/staff/${id}`, token, { method: "DELETE" });
      refetch();
    } catch {}
  };

  const staff = data?.staff ?? [];
  const nonDoctors = staff.filter(s => s.role !== "doctor");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{nonDoctors.length} staff member{nonDoctors.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowAdd(v => !v)} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Staff
        </Button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3 border">
              <p className="text-sm font-semibold">Add New Staff Member</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => setAddForm(f => ({ ...f, role: value }))}
                    className={`flex items-center gap-2 border-2 rounded-xl p-3 text-left transition-all ${addForm.role === value ? `${color} border-current` : "border-border bg-card hover:border-primary/30"}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
              <Input
                placeholder="Staff Name (optional)"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="h-10 text-sm"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="10-digit mobile"
                    value={addForm.mobile}
                    onChange={e => setAddForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="h-10 pl-9 text-sm"
                    type="tel"
                  />
                </div>
              </div>
              {addError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{addError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowAdd(false); setAddError(""); }}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={addStaff} disabled={adding}>
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                  Add
                </Button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs text-amber-800">
                  <strong>How it works:</strong> The staff member logs in via OTP on their mobile number. The system will automatically show their role-specific dashboard.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && <div className="text-center py-6 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading staff…</div>}

      {!isLoading && nonDoctors.length === 0 && !showAdd && (
        <div className="text-center py-8">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No staff added yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add reception staff or admins to your clinic</p>
        </div>
      )}

      <div className="space-y-2">
        {nonDoctors.map(member => {
          const roleOption = ROLE_OPTIONS.find(r => r.value === member.role);
          const Icon = roleOption?.icon ?? UserCheck;
          return (
            <div key={member.id} className="flex items-center gap-3 bg-card border rounded-xl p-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${roleOption?.color ?? "bg-muted text-muted-foreground"}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{member.name || member.mobile}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{member.mobile}</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{member.role}</Badge>
              <button onClick={() => removeStaff(member.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  token: string;
  clinicId: number;
}

const TABS = [
  { id: "clinic", label: "Clinic Details", icon: Building2 },
  { id: "template", label: "Prescription Layout", icon: FileText },
  { id: "staff", label: "Staff Management", icon: Users },
];

export function SettingsPanel({ open, onClose, token, clinicId }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("clinic");

  const { data, isLoading, refetch } = useQuery<{ clinic: Clinic; templates: Template[] }>({
    queryKey: ["doctor-clinic-settings", clinicId],
    queryFn: () => apiCall("/doctor/clinic", token),
    enabled: open,
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-background z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b bg-card">
              <h2 className="text-base font-bold">Settings</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-b bg-card">
              <div className="flex overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${activeTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading && (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {data && (
                <>
                  {activeTab === "clinic" && <ClinicTab token={token} clinic={data.clinic} templates={data.templates} onSaved={refetch} />}
                  {activeTab === "template" && <TemplateTab token={token} clinic={data.clinic} templates={data.templates} onSaved={refetch} />}
                  {activeTab === "staff" && <StaffTab token={token} clinicId={clinicId} />}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
