import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { HeartPulse, ArrowRight, ArrowLeft, CheckCircle2, FileText, Check } from "lucide-react";
import { useSendOtp, useRegisterClinic, useListTemplates, useUpdateClinicTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
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

  const sendOtpMutation = useSendOtp();
  const registerMutation = useRegisterClinic();
  const updateTemplateMutation = useUpdateClinicTemplate();
  const { data: templates } = useListTemplates({ query: { queryKey: getListTemplatesQueryKey() } });

  const infoForm = useForm<z.infer<typeof clinicInfoSchema>>({
    resolver: zodResolver(clinicInfoSchema),
    defaultValues: { 
      clinicName: "", clinicAddress: "", doctorName: "", doctorQualification: "", mobile: "", email: "" 
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const onInfoSubmit = (values: z.infer<typeof clinicInfoSchema>) => {
    sendOtpMutation.mutate({
      data: { mobile: values.mobile, purpose: "register" }
    }, {
      onSuccess: () => {
        setStep(2);
        toast({ title: "OTP Sent", description: "Please check your mobile for the verification code." });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Error", description: error.error || "Failed to send OTP." });
      }
    });
  };

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    const info = infoForm.getValues();
    registerMutation.mutate({
      data: { 
        ...info, 
        email: info.email || null,
        otp: values.otp 
      }
    }, {
      onSuccess: (data) => {
        setToken(data.token);
        setRegisteredClinicId(data.clinic.id);
        setClinicCode(data.clinicCode);
        setStep(3);
        toast({ title: "Verification Successful", description: "Clinic registered. Let's set up your branding." });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Registration Failed", description: error.error || "Invalid OTP." });
      }
    });
  };

  const handleFinishSetup = () => {
    if (selectedTemplateId && registeredClinicId) {
      updateTemplateMutation.mutate({
        clinicId: registeredClinicId,
        data: { templateId: selectedTemplateId }
      }, {
        onSuccess: () => setStep(4)
      });
    } else {
      setStep(4); // Skip template setup
    }
  };

  // Mock templates if API fails or returns none
  const displayTemplates = templates?.length ? templates : Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    name: `Modern Template ${i+1}`,
    description: "Clean layout",
    previewColor: ["#0891b2", "#0284c7", "#4f46e5", "#059669", "#dc2626", "#d97706"][i % 6]
  }));

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/30">
      <header className="px-6 py-4 flex items-center justify-between bg-card border-b border-border sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <HeartPulse className="w-6 h-6" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">ClinicFlow</span>
        </Link>
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Step {step} of 4
        </div>
      </header>

      <main className="flex-1 flex justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-[600px] relative">
          
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="bg-card p-8 rounded-2xl shadow-xl border border-border">
                <div className="mb-8">
                  <h1 className="text-3xl font-display font-bold mb-2">Register your clinic</h1>
                  <p className="text-muted-foreground">Tell us about your practice to set up your digital workspace.</p>
                </div>

                <Form {...infoForm}>
                  <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-5">
                    <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground uppercase tracking-wider"><CheckCircle2 className="w-4 h-4 text-primary" /> Clinic Details</h3>
                      <FormField
                        control={infoForm.control}
                        name="clinicName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clinic Name</FormLabel>
                            <FormControl><Input placeholder="City Care Clinic" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={infoForm.control}
                        name="clinicAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clinic Address</FormLabel>
                            <FormControl><Input placeholder="123 Medical Plaza, Downtown" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground uppercase tracking-wider"><CheckCircle2 className="w-4 h-4 text-primary" /> Primary Doctor</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={infoForm.control}
                          name="doctorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl><Input placeholder="Dr. Sarah Smith" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={infoForm.control}
                          name="doctorQualification"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qualifications</FormLabel>
                              <FormControl><Input placeholder="MBBS, MD" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-border/50">
                      <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground uppercase tracking-wider"><CheckCircle2 className="w-4 h-4 text-primary" /> Contact</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={infoForm.control}
                          name="mobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile Number (For Login)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="10 digits" 
                                  maxLength={10}
                                  {...field} 
                                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={infoForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                              <FormControl><Input type="email" placeholder="doctor@clinic.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base mt-4"
                      disabled={sendOtpMutation.isPending}
                    >
                      {sendOtpMutation.isPending ? "Processing..." : "Continue to Verification"}
                      {!sendOtpMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="bg-card p-8 sm:p-12 rounded-2xl shadow-xl border border-border text-center">
                <button onClick={() => setStep(1)} className="absolute top-8 left-8 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-3">Verify your number</h2>
                <p className="text-muted-foreground mb-10 max-w-sm mx-auto">
                  Enter the 6-digit verification code sent to <br/><span className="font-medium text-foreground">{infoForm.getValues("mobile")}</span>
                </p>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8 flex flex-col items-center">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl" />
                                <InputOTPSlot index={1} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl" />
                                <InputOTPSlot index={2} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl" />
                                <InputOTPSlot index={3} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl" />
                                <InputOTPSlot index={4} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl" />
                                <InputOTPSlot index={5} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl" />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full max-w-sm h-12 text-base"
                      disabled={registerMutation.isPending || otpForm.watch("otp").length !== 6}
                    >
                      {registerMutation.isPending ? "Verifying..." : "Verify & Create Account"}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="bg-card p-8 sm:p-10 rounded-2xl shadow-xl border border-border w-full max-w-4xl -mx-4 sm:mx-0">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-display font-bold mb-2">Choose a Prescription Style</h2>
                  <p className="text-muted-foreground">Select how your digital prescriptions will look. You can change this later.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 max-h-[50vh] overflow-y-auto p-2">
                  {displayTemplates?.map((template: any) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`relative flex flex-col text-left border-2 rounded-xl overflow-hidden transition-all duration-200 group ${selectedTemplateId === template.id ? 'border-primary ring-4 ring-primary/20 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                    >
                      <div className="aspect-[3/4] w-full bg-white p-4 relative border-b border-border/50">
                        {/* Mock Template Visual */}
                        <div className="w-full h-8 mb-4 border-b pb-2" style={{ borderBottomColor: template.previewColor }}>
                          <div className="w-1/2 h-3 rounded bg-muted-foreground/20 mb-1" />
                          <div className="w-1/3 h-2 rounded bg-muted-foreground/10" />
                        </div>
                        <div className="w-full h-4 mb-2 flex justify-between">
                          <div className="w-1/4 h-2 rounded bg-muted-foreground/10" />
                          <div className="w-1/4 h-2 rounded bg-muted-foreground/10" />
                        </div>
                        <div className="w-12 h-12 rounded-full mb-2 bg-muted/50 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                          <div className="w-full h-1 rounded bg-muted-foreground/10" />
                          <div className="w-3/4 h-1 rounded bg-muted-foreground/10" />
                          <div className="w-5/6 h-1 rounded bg-muted-foreground/10" />
                        </div>
                        
                        {selectedTemplateId === template.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => setStep(4)} disabled={updateTemplateMutation.isPending}>
                    Skip for now
                  </Button>
                  <Button onClick={handleFinishSetup} disabled={!selectedTemplateId || updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? "Saving..." : "Apply & Continue"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }} className="bg-card p-12 rounded-2xl shadow-xl border border-border text-center">
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600"
                >
                  <CheckCircle2 className="w-12 h-12" />
                </motion.div>
                
                <h2 className="text-4xl font-display font-bold mb-4">You're all set!</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  {infoForm.getValues("clinicName")} has been registered successfully.
                </p>

                <div className="bg-muted/50 border border-border rounded-xl p-6 mb-10 max-w-sm mx-auto">
                  <p className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Your Unique Clinic Code</p>
                  <p className="text-4xl font-mono font-bold tracking-widest text-primary">{clinicCode}</p>
                  <p className="text-xs text-muted-foreground mt-3">Share this code with your reception staff to link their accounts.</p>
                </div>

                <Button 
                  size="lg" 
                  className="w-full max-w-sm h-14 text-lg rounded-xl shadow-lg shadow-primary/20"
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
