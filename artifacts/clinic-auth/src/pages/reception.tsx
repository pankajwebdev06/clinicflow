import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  UserPlus, Search, Users, ClipboardList, CheckCircle2, XCircle,
  Clock, Camera, Upload, RotateCcw, ChevronRight, Phone, Hash,
  WifiOff, LogOut, HeartPulse, AlertCircle, Loader2, X,
  CalendarDays, User, Activity, Thermometer, Weight, CheckCheck,
  Image, Ban,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiCall<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw data;
    return data as T;
  });
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = url;
  });
}

interface Patient {
  id: number; name: string; mobile: string | null;
  age: number | null; gender: string | null; upid: string;
}
interface Visit {
  id: number; patientId: number; tokenNumber: number;
  queuePosition: number; status: string; symptoms: string | null;
  bp: string | null; weight: string | null; temperature: string | null;
  visitDate: string; prescriptionData: string | null;
}
interface QueueRow { visit: Visit; patient: Patient; }
interface QueueStats { waiting: number; inProgress: number; completed: number; cancelled: number; total: number; }
interface QueueData { queue: QueueRow[]; stats: QueueStats; total: number; }
interface SearchResult {
  found: boolean; patient?: Patient;
  lastVisit?: Visit | null; todayVisit?: Visit | null; visitCount?: number;
}

type CheckinStep = "search" | "found" | "form";
type Tab = "checkin" | "queue";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  waiting:     { label: "Waiting",        color: "bg-amber-100 text-amber-800 border-amber-200",   dot: "bg-amber-500" },
  in_progress: { label: "In Consultation", color: "bg-blue-100 text-blue-800 border-blue-200",    dot: "bg-blue-500" },
  completed:   { label: "Done",            color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
  cancelled:   { label: "Cancelled",       color: "bg-muted text-muted-foreground border-border",  dot: "bg-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function ReceptionDashboard() {
  const token = useAuthStore((s) => s.token);
  const clearToken = useAuthStore((s) => s.clearToken);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("checkin");
  const [step, setStep] = useState<CheckinStep>("search");
  const [mobile, setMobile] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLogout, setShowLogout] = useState(false);
  const [uploadVisitId, setUploadVisitId] = useState<number | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cancelVisitId, setCancelVisitId] = useState<number | null>(null);

  const form = useForm({
    defaultValues: {
      name: "", age: "", gender: "male", symptoms: "",
      bp: "", weight: "", temperature: "",
    },
  });

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

  const { data: queueData, isLoading: queueLoading } = useQuery<QueueData>({
    queryKey: ["reception-queue"],
    queryFn: () => apiCall<QueueData>("/reception/queue", token!),
    enabled: !!token,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const handleMobileChange = useCallback((val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setMobile(digits);
    if (digits.length === 10) handleSearch(digits);
    if (digits.length < 10) { setSearchResult(null); setStep("search"); }
  }, []);

  const handleSearch = useCallback(async (num: string) => {
    if (!token) return;
    setIsSearching(true);
    try {
      const result = await apiCall<SearchResult>(`/reception/search?mobile=${num}`, token);
      setSearchResult(result);
      setStep(result.found ? "found" : "form");
      if (!result.found) {
        form.reset({ name: "", age: "", gender: "male", symptoms: "", bp: "", weight: "", temperature: "" });
      }
    } catch {
      toast({ variant: "destructive", title: "Search failed", description: "Could not search patient. Check connection." });
    } finally {
      setIsSearching(false);
    }
  }, [token, form, toast]);

  const checkinMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiCall<{ tokenNumber: number; patient: Patient; message: string }>("/reception/checkin", token!, {
        method: "POST", body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      toast({ title: `Token #${data.tokenNumber} assigned!`, description: `${data.patient.name} added to queue` });
      queryClient.invalidateQueries({ queryKey: ["reception-queue"] });
      setMobile(""); setSearchResult(null); setStep("search"); form.reset();
      setTab("queue");
    },
    onError: (err: any) => {
      if (err.tokenNumber) {
        toast({ variant: "destructive", title: "Already in queue", description: `Patient has Token #${err.tokenNumber} (${err.status})` });
      } else {
        toast({ variant: "destructive", title: "Check-in failed", description: err.error ?? "Could not register patient" });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (visitId: number) =>
      apiCall("/reception/visit/" + visitId + "/cancel", token!, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-queue"] });
      setCancelVisitId(null);
      toast({ title: "Visit cancelled" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Cancel failed", description: err.error }),
  });

  const onCheckinSubmit = form.handleSubmit((values) => {
    const isReturning = searchResult?.found && searchResult.patient;
    checkinMutation.mutate({
      ...(isReturning
        ? { patientId: searchResult!.patient!.id }
        : { mobile }),
      name: isReturning ? searchResult!.patient!.name : values.name,
      age: values.age ? Number(values.age) : undefined,
      gender: values.gender,
      symptoms: values.symptoms,
      bp: values.bp || undefined,
      weight: values.weight || undefined,
      temperature: values.temperature || undefined,
    });
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setUploadPreview(compressed);
    e.target.value = "";
  };

  const handleUploadConfirm = async () => {
    if (!uploadPreview || !uploadVisitId || !token) return;
    setIsUploading(true);
    try {
      await apiCall(`/reception/visit/${uploadVisitId}/prescription`, token, {
        method: "POST", body: JSON.stringify({ imageData: uploadPreview }),
      });
      toast({ title: "Prescription uploaded!", description: "Attached to patient visit" });
      queryClient.invalidateQueries({ queryKey: ["reception-queue"] });
      setUploadVisitId(null); setUploadPreview(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.error ?? "Try again" });
    } finally {
      setIsUploading(false);
    }
  };

  const stats = queueData?.stats;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">ClinicFlow</p>
            <p className="text-[10px] text-muted-foreground">Reception Desk</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[10px] font-medium">
              <WifiOff className="w-3 h-3" /> Offline
            </div>
          )}
          {isOnline && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
            </div>
          )}
          <div className="relative">
            <button
              onMouseEnter={() => setShowLogout(true)}
              onMouseLeave={() => setShowLogout(false)}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showLogout && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-44 bg-popover border shadow-lg rounded-2xl p-3 z-50"
                  onMouseEnter={() => setShowLogout(true)}
                  onMouseLeave={() => setShowLogout(false)}
                >
                  <p className="text-xs font-semibold text-foreground mb-0.5">Logout?</p>
                  <p className="text-[10px] text-muted-foreground mb-3">You'll need OTP again</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLogout(false)} className="flex-1 py-1.5 rounded-lg bg-muted text-xs font-medium">No</button>
                    <button onClick={() => { clearToken(); setLocation("/login"); }} className="flex-1 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">Yes</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-[57px] z-10 bg-card border-b px-4 flex">
        {([
          { id: "checkin", icon: UserPlus, label: "Check-in" },
          { id: "queue",   icon: ClipboardList, label: "Queue" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === "queue" && stats && stats.waiting > 0 && (
              <span className="ml-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.waiting}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Check-in */}
      <AnimatePresence mode="wait">
        {tab === "checkin" && (
          <motion.div
            key="checkin"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 pb-8"
          >
            {/* Mobile Search */}
            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Mobile Number</p>
              </div>
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  className="pr-10 text-base h-12 rounded-xl"
                  maxLength={10}
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-muted-foreground animate-spin" />
                ) : mobile.length === 10 ? (
                  <CheckCircle2 className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
                ) : (
                  <Search className="absolute right-3 top-3.5 w-5 h-5 text-muted-foreground" />
                )}
              </div>
              {mobile.length > 0 && mobile.length < 10 && (
                <p className="text-xs text-muted-foreground mt-1.5">{10 - mobile.length} more digits needed</p>
              )}
            </div>

            {/* Patient Found */}
            <AnimatePresence>
              {step === "found" && searchResult?.found && searchResult.patient && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-card border-2 border-green-200 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Returning Patient Found
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{searchResult.patient.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {searchResult.patient.age && <span className="text-xs text-muted-foreground">{searchResult.patient.age} yrs</span>}
                        {searchResult.patient.gender && (
                          <Badge variant="outline" className={`text-[10px] capitalize ${searchResult.patient.gender === "female" ? "border-pink-300 text-pink-600" : "border-blue-300 text-blue-600"}`}>
                            {searchResult.patient.gender}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-mono">{searchResult.patient.upid}</Badge>
                      </div>
                    </div>
                  </div>

                  {searchResult.lastVisit && (
                    <div className="bg-muted/50 rounded-xl px-3 py-2 mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      Last visit: <span className="font-medium text-foreground">{searchResult.lastVisit.visitDate}</span>
                      {searchResult.lastVisit.symptoms && (
                        <span className="truncate ml-1">— {searchResult.lastVisit.symptoms}</span>
                      )}
                    </div>
                  )}

                  {searchResult.todayVisit && searchResult.todayVisit.status !== "cancelled" ? (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Already in today's queue</p>
                        <p className="text-xs text-amber-700">Token #{searchResult.todayVisit.tokenNumber} — {STATUS_CONFIG[searchResult.todayVisit.status]?.label}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Today's symptoms / reason for visit</p>
                      <textarea
                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        rows={2}
                        placeholder="Chief complaints today…"
                        {...form.register("symptoms", { required: true })}
                      />
                      <Button
                        className="w-full mt-3 h-12 rounded-xl text-base font-semibold"
                        onClick={onCheckinSubmit}
                        disabled={checkinMutation.isPending}
                      >
                        {checkinMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning…</>
                        ) : (
                          <><Hash className="w-4 h-4 mr-2" />Assign Token</>
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* New Patient Form */}
              {step === "form" && !searchResult?.found && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-card border-2 border-blue-200 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-4">
                    <UserPlus className="w-4 h-4" />
                    New Patient Registration
                  </div>

                  <form onSubmit={onCheckinSubmit} className="space-y-3">
                    <div>
                      <Label className="text-xs font-semibold">Full Name *</Label>
                      <Input
                        className="mt-1 h-11 rounded-xl"
                        placeholder="Patient's full name"
                        {...form.register("name", { required: true })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Age</Label>
                        <Input
                          className="mt-1 h-11 rounded-xl"
                          type="number"
                          placeholder="Age"
                          inputMode="numeric"
                          {...form.register("age")}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Gender</Label>
                        <div className="flex gap-2 mt-1">
                          {["male", "female", "other"].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => form.setValue("gender", g)}
                              className={`flex-1 h-11 rounded-xl border text-xs font-medium capitalize transition-all ${
                                form.watch("gender") === g
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border hover:border-primary/40"
                              }`}
                            >
                              {g === "male" ? "M" : g === "female" ? "F" : "O"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Chief Complaints *</Label>
                      <textarea
                        className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                        rows={2}
                        placeholder="Symptoms, reason for visit…"
                        {...form.register("symptoms", { required: true })}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Vitals (Optional)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: "bp" as const, icon: Activity, placeholder: "120/80", label: "BP" },
                          { name: "weight" as const, icon: Weight, placeholder: "65 kg", label: "Wt" },
                          { name: "temperature" as const, icon: Thermometer, placeholder: "98.6°F", label: "Temp" },
                        ].map(({ name, icon: Icon, placeholder, label }) => (
                          <div key={name} className="bg-muted/50 rounded-xl p-2.5 border">
                            <div className="flex items-center gap-1 mb-1.5">
                              <Icon className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
                            </div>
                            <Input
                              className="h-8 text-xs border-0 bg-transparent p-0 focus-visible:ring-0"
                              placeholder={placeholder}
                              {...form.register(name)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-semibold mt-2"
                      disabled={checkinMutation.isPending}
                    >
                      {checkinMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering…</>
                      ) : (
                        <><Hash className="w-4 h-4 mr-2" />Register & Assign Token</>
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Idle hint */}
            {step === "search" && !isSearching && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium">Enter mobile number to begin</p>
                <p className="text-xs mt-1">System will auto-detect returning patients</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Queue */}
        {tab === "queue" && (
          <motion.div
            key="queue"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="flex-1 overflow-y-auto pb-8"
          >
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 p-4">
              {[
                { label: "Waiting",    value: stats?.waiting ?? 0,     color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
                { label: "With Doctor", value: stats?.inProgress ?? 0,  color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
                { label: "Done",        value: stats?.completed ?? 0,   color: "text-green-600",  bg: "bg-green-50 border-green-200" },
                { label: "Cancelled",  value: stats?.cancelled ?? 0,   color: "text-muted-foreground", bg: "bg-muted border-border" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} border rounded-2xl p-3 text-center`}>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Queue List */}
            {queueLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading queue…</p>
              </div>
            )}

            {!queueLoading && (!queueData?.queue || queueData.queue.length === 0) && (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No patients in queue today</p>
                <p className="text-xs text-muted-foreground mt-1">Use Check-in tab to add patients</p>
              </div>
            )}

            <div className="px-4 space-y-3">
              {queueData?.queue.map(({ visit, patient }) => {
                const cfg = STATUS_CONFIG[visit.status] ?? STATUS_CONFIG.waiting;
                const canCancel = visit.status === "waiting";
                const canUpload = visit.status === "in_progress" || visit.status === "completed";
                const hasPrescription = !!visit.prescriptionData;

                return (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-card border rounded-2xl shadow-sm overflow-hidden ${
                      visit.status === "in_progress" ? "border-blue-200 ring-1 ring-blue-100" :
                      visit.status === "cancelled" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                            visit.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                            visit.status === "completed" ? "bg-green-100 text-green-700" :
                            visit.status === "cancelled" ? "bg-muted text-muted-foreground" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            #{visit.tokenNumber}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{patient.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {patient.age && <span className="text-[11px] text-muted-foreground">{patient.age} yrs</span>}
                              {patient.gender && (
                                <span className={`text-[11px] font-medium capitalize ${patient.gender === "female" ? "text-pink-500" : "text-blue-500"}`}>
                                  {patient.gender}
                                </span>
                              )}
                              {hasPrescription && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <Image className="w-2.5 h-2.5" />Rx
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={visit.status} />
                      </div>

                      {visit.symptoms && (
                        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Complaints</p>
                          <p className="text-xs text-amber-900 line-clamp-2">{visit.symptoms}</p>
                        </div>
                      )}

                      {(visit.bp || visit.weight || visit.temperature) && (
                        <div className="flex gap-2 mt-3">
                          {[
                            { icon: Activity, label: "BP", val: visit.bp },
                            { icon: Weight, label: "Wt", val: visit.weight },
                            { icon: Thermometer, label: "Temp", val: visit.temperature },
                          ].filter(v => v.val).map(({ icon: Icon, label, val }) => (
                            <div key={label} className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
                              <Icon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{label}:</span>
                              <span className="text-[10px] font-semibold">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {(canCancel || canUpload) && (
                        <div className="flex gap-2 mt-3">
                          {canUpload && (
                            <button
                              onClick={() => { setUploadVisitId(visit.id); setUploadPreview(null); }}
                              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                                hasPrescription
                                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              {hasPrescription ? <><CheckCheck className="w-3.5 h-3.5" />Rx Uploaded</> : <><Camera className="w-3.5 h-3.5" />Upload Rx</>}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => setCancelVisitId(visit.id)}
                              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all active:scale-95"
                            >
                              <Ban className="w-3.5 h-3.5" />Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelVisitId} onOpenChange={() => setCancelVisitId(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Cancel this visit?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This patient will be removed from the queue. This cannot be undone.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelVisitId(null)}>Keep</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={cancelMutation.isPending}
              onClick={() => cancelVisitId && cancelMutation.mutate(cancelVisitId)}
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Visit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Upload Modal */}
      <Dialog open={!!uploadVisitId} onOpenChange={(o) => { if (!o) { setUploadVisitId(null); setUploadPreview(null); } }}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b bg-primary/5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Camera className="w-5 h-5 text-primary" />
              Upload Prescription
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {!uploadPreview ? (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                >
                  <Camera className="w-10 h-10 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">Take Photo or Upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Tap to open camera or choose file</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); setTimeout(() => fileRef.current?.setAttribute("capture", "environment"), 100); } }}
                  >
                    <Upload className="w-4 h-4 mr-2" />From Gallery
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />Camera
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-2xl overflow-hidden border">
                  <img src={uploadPreview} alt="Prescription preview" className="w-full object-contain max-h-64" />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setUploadPreview(null); fileRef.current?.click(); }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />Retake
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleUploadConfirm}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" />Confirm Upload</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
