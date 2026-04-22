import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  HeartPulse, ArrowRight, ArrowLeft, CheckCircle2,
  FileText, Check, AlertCircle, MessageCircle, Smartphone
} from "lucide-react";
import {
  useSendOtp, useRegisterClinic, useListTemplates,
  useUpdateClinicTemplate, getListTemplatesQueryKey
} from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { OtpResendTimer } from "@/components/otp-resend-timer";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP, InputOTPGroup, InputOTPSlot,
} from "@/components/ui/input-otp";

const clinicInfoSchema = z.object({
  clinicName: z.string().min(2, "Clinic name is required"),
  clinicAddress: z.string().min(5, "Clinic address is required"),
  doctorName: z.string().min(2, "Doctor name is required"),
  doctorQualification: z.string().min(2, "Qualification is required"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const setToken = useAuthStore((state) => state.setToken);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [registeredClinicId, setRegisteredClinicId] = useState<number | null>(null);
  const [clinicCode, setClinicCode] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<"sms" | "whatsapp">("sms");

  const sendOtpMutation = useSendOtp();
  const registerMutation = useRegisterClinic();
  const updateTemplateMutation = useUpdateClinicTemplate();
  const { data: templates } = useListTemplates({ query: { queryKey: getListTemplatesQueryKey() } });

  const infoForm = useForm<z.infer<typeof clinicInfoSchema>>({
    resolver: zodResolver(clinicInfoSchema),
    defaultValues: { clinicName: "", clinicAddress: "", doctorName: "", doctorQualification: "", mobile: "", email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const sendOtp = useCallback((mobile: string, channel: "sms" | "whatsapp") => {
    sendOtpMutation.mutate(
      { data: { mobile, purpose: "register" }, ...(channel === "whatsapp" ? { channel } : {}) } as any,
      {
        onSuccess: (data: any) => {
          setSentChannel(channel);
          setDevOtp(data.otp ?? null);
          setStep(2);
          toast({
            title: channel === "whatsapp" ? "OTP sent via WhatsApp" : "OTP sent via SMS",
            description: data.otp
              ? `Dev mode — your OTP is: ${data.otp}`
              : "Please check your mobile.",
          });
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Error", description: error.error || "Failed to send OTP." });
        },
      }
    );
  }, [sendOtpMutation, toast]);

  const onInfoSubmit = (values: z.infer<typeof clinicInfoSchema>) => {
    sendOtp(values.mobile, "sms");
  };

  const onInfoWhatsapp = () => {
    const values = infoForm.getValues();
    const result = clinicInfoSchema.safeParse(values);
    if (!result.success) {
      infoForm.trigger();
      return;
    }
    sendOtp(values.mobile, "whatsapp");
  };

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    const info = infoForm.getValues();
    registerMutation.mutate(
      { data: { ...info, email: info.email || null, otp: values.otp } },
      {
        onSuccess: (data) => {
          setToken(data.token, data.clinic.id);
          setRegisteredClinicId(data.clinic.id);
          setClinicCode(data.clinicCode);
          setStep(3);
          toast({ title: "Verification Successful", description: "Clinic registered. Let's set up your branding." });
        },
        onError: (error: any) => {
          toast({ variant: "destructive", title: "Registration Failed", description: error.error || "Invalid OTP." });
        },
      }
    );
  };

  const handleFinishSetup = () => {
    if (selectedTemplateId && registeredClinicId) {
      updateTemplateMutation.mutate(
        { clinicId: registeredClinicId, data: { templateId: selectedTemplateId } },
        { onSuccess: () => setStep(4) }
      );
    } else {
      setStep(4);
    }
  };

  const mobile = infoForm.watch("mobile");

  const handleResendSms = useCallback(() => {
    sendOtp(mobile, "sms");
  }, [mobile, sendOtp]);

  const handleResendWhatsapp = useCallback(() => {
    sendOtp(mobile, "whatsapp");
  }, [mobile, sendOtp]);

  const displayTemplates = templates?.length
    ? templates
    : Array.from({ length: 10 }).map((_, i) => ({
        id: i + 1,
        name: `Template ${i + 1}`,
        description: "Professional layout",
        previewColor: ["#1E40AF", "#0F766E", "#15803D", "#9F1239", "#0284C7", "#475569", "#C2410C", "#7C3AED", "#166534", "#1E3A5F"][i % 10],
      }));

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between bg-card border-b border-border sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground">ClinicFlow</span>
        </Link>
        <div className="text-xs sm:text-sm font-medium text-muted-foreground">
          Step {step} of 4
        </div>
      </header>

      {/* Step progress bar */}
      <div className="w-full h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>

      <main className="flex-1 flex justify-center py-6 sm:py-12 px-4 sm:px-6">
        <div className="w-full max-w-[600px] relative">
          <AnimatePresence mode="wait" initial={false}>

            {/* Step 1 — Clinic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border"
              >
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">Register your clinic</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">Tell us about your practice to set up your digital workspace.</p>
                </div>

                <Form {...infoForm}>
                  <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-4 sm:space-y-5">
                    {/* Clinic Details */}
                    <div className="space-y-4 bg-muted/30 p-4 sm:p-5 rounded-xl border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-xs text-foreground uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-primary" /> Clinic Details
                      </h3>
                      <FormField control={infoForm.control} name="clinicName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clinic Name</FormLabel>
                          <FormControl><Input placeholder="City Care Clinic" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={infoForm.control} name="clinicAddress" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clinic Address</FormLabel>
                          <FormControl><Input placeholder="123 Medical Plaza, Downtown" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    {/* Doctor Info */}
                    <div className="space-y-4 bg-muted/30 p-4 sm:p-5 rounded-xl border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-xs text-foreground uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-primary" /> Primary Doctor
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <FormField control={infoForm.control} name="doctorName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="Dr. Sarah Smith" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={infoForm.control} name="doctorQualification" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qualifications</FormLabel>
                            <FormControl><Input placeholder="MBBS, MD" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4 bg-muted/30 p-4 sm:p-5 rounded-xl border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-xs text-foreground uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-primary" /> Contact
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <FormField control={infoForm.control} name="mobile" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="10 digits"
                                maxLength={10}
                                type="tel"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={infoForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                            <FormControl><Input type="email" placeholder="doctor@clinic.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <Button
                        type="submit"
                        className="w-full h-12 text-sm sm:text-base"
                        disabled={sendOtpMutation.isPending}
                      >
                        {sendOtpMutation.isPending && sentChannel === "sms" ? "Sending..." : (
                          <>
                            <Smartphone className="w-4 h-4 mr-2" />
                            Continue — Send OTP via SMS
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 text-sm sm:text-base border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/5 hover:border-[#25D366]/60"
                        disabled={sendOtpMutation.isPending}
                        onClick={onInfoWhatsapp}
                      >
                        {sendOtpMutation.isPending && sentChannel === "whatsapp" ? "Sending..." : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
                            Continue — Send OTP via WhatsApp
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 2 — OTP Verification */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="bg-card p-6 sm:p-10 rounded-2xl shadow-xl border border-border text-center"
              >
                <button
                  onClick={() => { setStep(1); setDevOtp(null); }}
                  className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5 text-primary">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Verify your number</h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-2 max-w-xs mx-auto">
                  Code sent to <span className="font-medium text-foreground">{infoForm.getValues("mobile")}</span>
                </p>
                <p className="text-xs mb-6" style={{ color: sentChannel === "whatsapp" ? "#25D366" : "var(--muted-foreground)" }}>
                  via {sentChannel === "whatsapp" ? "WhatsApp" : "SMS"}
                </p>

                {/* Dev mode OTP banner */}
                {devOtp && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left max-w-xs mx-auto"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Dev Mode — OTP Code</p>
                      <p className="text-2xl font-mono font-bold tracking-widest text-amber-900 mt-0.5">{devOtp}</p>
                    </div>
                  </motion.div>
                )}

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6 flex flex-col items-center">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup className="gap-1 sm:gap-2">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <InputOTPSlot
                                    key={i}
                                    index={i}
                                    className="w-10 h-12 sm:w-12 sm:h-14 text-base sm:text-xl"
                                  />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full max-w-xs h-12 text-sm sm:text-base"
                      disabled={registerMutation.isPending || otpForm.watch("otp").length !== 6}
                    >
                      {registerMutation.isPending ? "Verifying..." : "Verify & Create Account"}
                    </Button>
                  </form>
                </Form>

                <OtpResendTimer
                  mobile={infoForm.getValues("mobile")}
                  isPending={sendOtpMutation.isPending}
                  onResendSms={handleResendSms}
                  onResendWhatsapp={handleResendWhatsapp}
                />
              </motion.div>
            )}

            {/* Step 3 — Template Selection */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border"
              >
                <div className="mb-6 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Choose a Prescription Style</h2>
                  <p className="text-muted-foreground text-sm sm:text-base">Select how your digital prescriptions will look. You can change this later.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-[55vh] overflow-y-auto pr-1">
                  {displayTemplates?.map((template: any) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`relative flex flex-col text-left border-2 rounded-xl overflow-hidden transition-all duration-200 ${
                        selectedTemplateId === template.id
                          ? "border-primary ring-4 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="aspect-[3/4] w-full bg-white p-3 relative border-b border-border/50">
                        <div className="w-full h-6 mb-3 border-b pb-1" style={{ borderBottomColor: template.previewColor }}>
                          <div className="w-1/2 h-2 rounded mb-1" style={{ backgroundColor: template.previewColor + "33" }} />
                          <div className="w-1/3 h-1.5 rounded" style={{ backgroundColor: template.previewColor + "22" }} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                            <FileText className="w-3 h-3 text-muted-foreground/40" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="w-full h-1 rounded bg-muted-foreground/10" />
                            <div className="w-3/4 h-1 rounded bg-muted-foreground/10" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="w-full h-1 rounded bg-muted-foreground/10" />
                          <div className="w-5/6 h-1 rounded bg-muted-foreground/10" />
                          <div className="w-4/6 h-1 rounded bg-muted-foreground/10" />
                          <div className="w-full h-1 rounded bg-muted-foreground/10" />
                        </div>
                        {/* Accent color bar at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: template.previewColor }} />

                        {selectedTemplateId === template.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-3">
                        <p className="font-semibold text-xs sm:text-sm leading-tight">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-1">{template.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)} disabled={updateTemplateMutation.isPending}>
                    Skip for now
                  </Button>
                  <Button onClick={handleFinishSetup} disabled={!selectedTemplateId || updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? "Saving..." : "Apply & Continue"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4 — Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="bg-card p-8 sm:p-12 rounded-2xl shadow-xl border border-border text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 text-green-600"
                >
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
                </motion.div>

                <h2 className="text-3xl sm:text-4xl font-bold mb-3">You're all set!</h2>
                <p className="text-muted-foreground text-base sm:text-lg mb-8">
                  {infoForm.getValues("clinicName")} has been registered successfully.
                </p>

                <div className="bg-muted/50 border border-border rounded-xl p-5 sm:p-6 mb-8 sm:mb-10 max-w-xs mx-auto">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Your Unique Clinic Code</p>
                  <p className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-primary">{clinicCode}</p>
                  <p className="text-xs text-muted-foreground mt-3">Share this code with your reception staff to link their accounts.</p>
                </div>

                <Button
                  size="lg"
                  className="w-full max-w-xs h-12 sm:h-14 text-base sm:text-lg rounded-xl shadow-lg shadow-primary/20"
                  onClick={() => setLocation("/doctor")}
                >
                  Go to Dashboard
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
