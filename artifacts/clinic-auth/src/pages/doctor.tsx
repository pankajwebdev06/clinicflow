import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HeartPulse, CheckCircle2, SkipForward, XCircle, Clock, Users, UserCheck,
  Activity, Thermometer, Weight, Phone, User, CalendarDays, Hash, ChevronRight,
  History, Maximize2, WifiOff, Wifi, LogOut, TrendingUp, BarChart3, RefreshCw,
  Settings, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { SettingsPanel } from "./settings-panel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type VisitStatus = "waiting" | "in_progress" | "completed" | "cancelled";

interface Patient {
  id: number;
  name: string;
  mobile: string | null;
  age: number | null;
  gender: string | null;
  upid: string;
}

interface Visit {
  id: number;
  tokenNumber: number;
  queuePosition: number;
  status: VisitStatus;
  symptoms: string | null;
  bp: string | null;
  weight: string | null;
  temperature: string | null;
  notes: string | null;
  consultationStart: string | null;
  consultationEnd: string | null;
  visitDate: string;
}

interface DashboardData {
  current: { visit: Visit; patient: Patient; history: Visit[] } | null;
  waitingCount: number;
  nextPatient: { visit: Visit; patient: Patient } | null;
  summary: {
    total: number;
    completed: number;
    waiting: number;
    cancelled: number;
    avgConsultationMinutes: number;
  };
}

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

function useConsultationTimer(startTime: string | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function GenderBadge({ gender }: { gender: string | null }) {
  if (!gender) return null;
  const colors: Record<string, string> = { male: "bg-blue-100 text-blue-700", female: "bg-pink-100 text-pink-700", other: "bg-purple-100 text-purple-700" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors[gender] ?? "bg-muted text-muted-foreground"}`}>{gender}</span>;
}

function VitalChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-semibold text-foreground leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function HistoryModal({ patientId, patientName, token, open, onClose }: { patientId: number; patientName: string; token: string; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-history", patientId],
    queryFn: () => apiCall<{ history: Visit[] }>(`/doctor/patient/${patientId}/history`, token),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {patientName} — Visit History
          </DialogTitle>
          <DialogDescription>Last 5 recorded visits for this patient</DialogDescription>
        </DialogHeader>
        {isLoading && <div className="py-8 text-center text-muted-foreground text-sm">Loading history…</div>}
        {!isLoading && (!data?.history?.length) && (
          <div className="py-8 text-center text-muted-foreground text-sm">No previous visits found.</div>
        )}
        <div className="space-y-3">
          {data?.history?.map((visit, i) => (
            <div key={visit.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{visit.visitDate}</span>
                <Badge variant={visit.status === "completed" ? "default" : "secondary"} className="text-xs">{visit.status}</Badge>
              </div>
              {visit.symptoms && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Symptoms:</span> {visit.symptoms}</p>}
              {visit.notes && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground">Notes:</span> {visit.notes}</p>}
              {i === 0 && <span className="text-xs text-primary font-medium">← Most recent</span>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTab({ summary }: { summary: DashboardData["summary"] }) {
  const stats = [
    { label: "Total Patients", value: summary.total, icon: Users, color: "text-primary bg-primary/10" },
    { label: "Completed", value: summary.completed, icon: CheckCircle2, color: "text-green-600 bg-green-100" },
    { label: "Waiting", value: summary.waiting, icon: Clock, color: "text-amber-600 bg-amber-100" },
    { label: "Cancelled", value: summary.cancelled, icon: XCircle, color: "text-red-500 bg-red-100" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color.split(" ")[1]}`}>
              <Icon className={`w-5 h-5 ${color.split(" ")[0]}`} />
            </div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-3xl font-bold">{summary.avgConsultationMinutes} <span className="text-base font-normal text-muted-foreground">min</span></p>
          <p className="text-xs text-muted-foreground">Average Consultation Time</p>
        </div>
      </div>

      {summary.total === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          No patients seen today yet
        </div>
      )}
    </motion.div>
  );
}

function LogoutButton({ onConfirm }: { onConfirm: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowConfirm(true);
  };

  const handleMouseLeave = () => {
    hideTimer.current = setTimeout(() => setShowConfirm(false), 400);
  };

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground">
        <LogOut className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="absolute top-10 right-0 z-50 bg-card border shadow-xl rounded-2xl p-4 w-52"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <p className="text-sm font-semibold text-foreground">Logout?</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">You'll need to login again with OTP.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
              >
                No
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
              >
                Yes, logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DoctorDashboard() {
  const token = useAuthStore((s) => s.token);
  const storedClinicId = useAuthStore((s) => s.clinicId);
  const clearToken = useAuthStore((s) => s.clearToken);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"patient" | "summary">("patient");
  const [showCancel, setShowCancel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExpand, setShowExpand] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [actionLock, setActionLock] = useState(false);
  const prevPatientId = useRef<number | null>(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token, setLocation]);

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ["doctor-dashboard"],
    queryFn: () => apiCall<DashboardData>("/doctor/dashboard", token!),
    enabled: !!token,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const seedMutation = useMutation({
    mutationFn: () => apiCall("/doctor/demo-seed", token!, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor-dashboard"] }),
  });

  const doAction = useCallback(async (action: "done" | "next" | "cancel") => {
    if (!data?.current || actionLock) return;
    setActionLock(true);
    if (action === "cancel") setShowCancel(false);
    try {
      await apiCall(`/doctor/visit/${data.current.visit.id}/${action}`, token!, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["doctor-dashboard"] });
    } finally {
      setActionLock(false);
    }
  }, [data, token, queryClient, actionLock]);

  const timer = useConsultationTimer(data?.current?.visit.consultationStart ?? null);

  const currentId = data?.current?.patient.id ?? null;
  const patientChanged = currentId !== prevPatientId.current;
  if (patientChanged) prevPatientId.current = currentId;

  const handleLogout = () => { clearToken(); setLocation("/login"); };

  if (!token) return null;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">ClinicFlow</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Doctor Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${isOnline ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
          >
            <Settings className="w-4 h-4" />
          </button>
          <LogoutButton onConfirm={handleLogout} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-card border-b px-4 flex gap-0">
        {[{ id: "patient", label: "Current Patient", icon: User }, { id: "summary", label: "Daily Summary", icon: BarChart3 }].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as "patient" | "summary")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-all ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading queue…</p>
          </div>
        )}

        {isError && (
          <div className="p-6 text-center">
            <WifiOff className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold">Working offline</p>
            <p className="text-xs text-muted-foreground mt-1">Unable to fetch queue — sync will resume when online.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {tab === "summary" && <SummaryTab summary={data.summary} />}

            {tab === "patient" && (
              <div className="p-4 space-y-3">
                {/* Queue Status Bar */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">
                        {data.current?.visit.tokenNumber ?? "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground leading-none">Token</p>
                      <p className="text-base font-bold text-foreground mt-0.5">#{data.current?.visit.tokenNumber ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Waiting</p>
                    <p className="text-xl font-bold text-amber-600">{data.waitingCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Done</p>
                    <p className="text-xl font-bold text-green-600">{data.summary.completed}</p>
                  </div>
                  {data.current?.visit.consultationStart && (
                    <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-mono font-semibold text-primary">{timer}</span>
                    </div>
                  )}
                </div>

                {/* No Patient State */}
                {!data.current && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12 px-6"
                  >
                    <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-5">
                      <UserCheck className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No patients waiting</h2>
                    <p className="text-sm text-muted-foreground mb-6">Queue is empty. New patients will appear here when reception adds them.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                      className="text-xs"
                    >
                      {seedMutation.isPending ? "Adding…" : "Load demo patients"}
                    </Button>
                  </motion.div>
                )}

                {/* Current Patient Card */}
                <AnimatePresence mode="wait">
                  {data.current && (
                    <motion.div
                      key={data.current.patient.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Patient Identity */}
                      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-foreground leading-tight">{data.current.patient.name}</h2>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {data.current.patient.age && (
                                  <span className="text-sm text-muted-foreground">{data.current.patient.age} yrs</span>
                                )}
                                <GenderBadge gender={data.current.patient.gender} />
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0 mt-1">{data.current.patient.upid}</Badge>
                        </div>

                        {data.current.patient.mobile && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{data.current.patient.mobile}</span>
                          </div>
                        )}

                        {/* Symptoms */}
                        {data.current.visit.symptoms && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Chief Complaints</p>
                            <p className="text-sm text-amber-900 font-medium">{data.current.visit.symptoms}</p>
                          </div>
                        )}

                        {/* Vitals */}
                        {(data.current.visit.bp || data.current.visit.weight || data.current.visit.temperature) && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vitals</p>
                            <div className="grid grid-cols-3 gap-2">
                              <VitalChip icon={Activity} label="BP" value={data.current.visit.bp} />
                              <VitalChip icon={Weight} label="Weight" value={data.current.visit.weight} />
                              <VitalChip icon={Thermometer} label="Temp" value={data.current.visit.temperature} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Last Visit Summary */}
                      {data.current.history.length > 0 && (
                        <div className="bg-card border rounded-2xl p-4 shadow-sm mt-3">
                          <div className="flex items-center gap-2 mb-3">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            <p className="text-sm font-semibold">Last Visit — {data.current.history[0].visitDate}</p>
                          </div>
                          {data.current.history[0].symptoms && (
                            <p className="text-sm text-muted-foreground mb-1">
                              <span className="font-medium text-foreground">Complaints:</span> {data.current.history[0].symptoms}
                            </p>
                          )}
                          {data.current.history[0].notes && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Notes:</span> {data.current.history[0].notes}
                            </p>
                          )}
                          <Badge variant="secondary" className="text-[10px] mt-2">Returning patient • {data.current.history.length} visit{data.current.history.length > 1 ? "s" : ""}</Badge>
                        </div>
                      )}

                      {/* Quick Actions Row */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setShowHistory(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-card border rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
                        >
                          <History className="w-4 h-4" />
                          View History
                        </button>
                        <button
                          onClick={() => setShowExpand(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-card border rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
                        >
                          <Maximize2 className="w-4 h-4" />
                          Expand
                        </button>
                      </div>

                      {/* Next Patient Preview */}
                      {data.nextPatient && (
                        <div className="bg-muted/50 rounded-xl px-4 py-3 flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Up next:</span>
                            <span className="text-xs font-semibold">{data.nextPatient.patient.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            Token #{data.nextPatient.visit.tokenNumber}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons — Sticky Bottom */}
      {data?.current && tab === "patient" && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card border-t px-4 py-4 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <AnimatePresence>
            {showCancel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between"
              >
                <p className="text-sm font-medium text-red-800">Cancel this patient?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowCancel(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors">No</button>
                  <button onClick={() => doAction("cancel")} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Yes, cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={actionLock}
              onClick={() => doAction("done")}
              className="flex flex-col items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl py-4 font-semibold text-sm transition-colors shadow-sm active:shadow-inner"
            >
              <CheckCircle2 className="w-6 h-6" />
              DONE
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={actionLock}
              onClick={() => doAction("next")}
              className="flex flex-col items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-2xl py-4 font-semibold text-sm transition-colors shadow-sm active:shadow-inner"
            >
              <SkipForward className="w-6 h-6" />
              NEXT
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={actionLock}
              onClick={() => setShowCancel(true)}
              className="flex flex-col items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 rounded-2xl py-4 font-semibold text-sm transition-colors"
            >
              <XCircle className="w-6 h-6" />
              CANCEL
            </motion.button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {data?.current && (
        <HistoryModal
          patientId={data.current.patient.id}
          patientName={data.current.patient.name}
          token={token!}
          open={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Expand Patient Modal */}
      <Dialog open={showExpand} onOpenChange={setShowExpand}>
        <DialogContent className="max-w-sm w-full p-0 overflow-hidden rounded-2xl gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b bg-primary/5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              {data?.current?.patient.name ?? "Patient Details"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Full consultation details for current patient
            </DialogDescription>
          </DialogHeader>
          {data?.current && (
            <div className="overflow-y-auto max-h-[70vh] px-5 py-4 space-y-4">
              {/* Identity Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">{data.current.patient.upid}</Badge>
                {data.current.patient.age && (
                  <span className="text-xs text-muted-foreground">{data.current.patient.age} yrs</span>
                )}
                <GenderBadge gender={data.current.patient.gender} />
                <Badge variant="secondary" className="text-[10px]">Token #{data.current.visit.tokenNumber}</Badge>
              </div>

              {/* Contact */}
              {data.current.patient.mobile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{data.current.patient.mobile}</span>
                </div>
              )}

              {/* Chief Complaints */}
              {data.current.visit.symptoms && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Chief Complaints</p>
                  <p className="text-sm text-amber-900 font-medium leading-relaxed">{data.current.visit.symptoms}</p>
                </div>
              )}

              {/* Vitals */}
              {(data.current.visit.bp || data.current.visit.weight || data.current.visit.temperature) && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vitals</p>
                  <div className="grid grid-cols-3 gap-2">
                    <VitalChip icon={Activity} label="BP" value={data.current.visit.bp} />
                    <VitalChip icon={Weight} label="Weight" value={data.current.visit.weight} />
                    <VitalChip icon={Thermometer} label="Temp" value={data.current.visit.temperature} />
                  </div>
                </div>
              )}

              {/* Consultation Timer */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Consultation Time</p>
                  <p className="text-sm font-bold text-primary">{timer}</p>
                </div>
              </div>

              {/* Visit History */}
              {data.current.history.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Visit History ({data.current.history.length})
                  </p>
                  <div className="space-y-2">
                    {data.current.history.map((h, i) => (
                      <div key={i} className="bg-card border rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold">{h.visitDate}</span>
                          {i === 0 && <Badge variant="secondary" className="text-[9px] py-0">Last visit</Badge>}
                        </div>
                        {h.symptoms && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Complaints:</span> {h.symptoms}
                          </p>
                        )}
                        {h.notes && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Notes:</span> {h.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.current.history.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-xs bg-muted/30 rounded-xl">
                  First visit — no previous history
                </div>
              )}
            </div>
          )}
          <div className="px-5 py-3 border-t bg-muted/20">
            <Button className="w-full" size="sm" onClick={() => setShowExpand(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Panel */}
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        token={token!}
        clinicId={storedClinicId ?? 1}
      />
    </div>
  );
}
