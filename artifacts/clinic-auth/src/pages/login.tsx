import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { HeartPulse, ArrowRight, ArrowLeft, MessageCircle, Smartphone, AlertCircle } from "lucide-react";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { OtpResendTimer } from "@/components/otp-resend-timer";

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

const phoneSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const setToken = useAuthStore((state) => state.setToken);

  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<"sms" | "whatsapp">("sms");

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { mobile: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const sendOtp = useCallback((mobileNo: string, channel: "sms" | "whatsapp") => {
    sendOtpMutation.mutate(
      { data: { mobile: mobileNo, purpose: "login" }, ...(channel === "whatsapp" ? { channel } : {}) } as any,
      {
        onSuccess: (data: any) => {
          setMobile(mobileNo);
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
          toast({
            variant: "destructive",
            title: "Error",
            description: error.error || "Failed to send OTP. This number might not be registered.",
          });
        },
      }
    );
  }, [sendOtpMutation, toast]);

  const onPhoneSubmit = (values: z.infer<typeof phoneSchema>) => {
    sendOtp(values.mobile, "sms");
  };

  const onPhoneWhatsapp = () => {
    const values = phoneForm.getValues();
    if (!/^\d{10}$/.test(values.mobile)) {
      phoneForm.setError("mobile", { message: "Mobile number must be exactly 10 digits" });
      return;
    }
    sendOtp(values.mobile, "whatsapp");
  };

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    verifyOtpMutation.mutate(
      { data: { mobile, otp: values.otp } },
      {
        onSuccess: (data) => {
          setToken(data.token, data.clinic?.id ?? null);
          let redirectPath = "/";
          if (data.redirectTo === "doctor_dashboard") redirectPath = "/doctor";
          else if (data.redirectTo === "reception_dashboard") redirectPath = "/reception";
          else if (data.redirectTo === "manager_dashboard") redirectPath = "/manager";
          else if (data.redirectTo === "admin_panel") redirectPath = "/admin";
          toast({ title: "Welcome back", description: `Logged in as ${data.user.role}` });
          setTimeout(() => setLocation(redirectPath), 500);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Invalid OTP",
            description: error.error || "The OTP entered is incorrect or expired.",
          });
        },
      }
    );
  };

  const handleResendSms = useCallback(() => {
    sendOtp(mobile, "sms");
  }, [mobile, sendOtp]);

  const handleResendWhatsapp = useCallback(() => {
    sendOtp(mobile, "whatsapp");
  }, [mobile, sendOtp]);

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Left side — Form */}
      <div className="w-full lg:w-[480px] flex flex-col relative z-10 bg-card shadow-2xl">
        <div className="p-6 sm:p-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground">ClinicFlow</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-12 pb-16">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">Enter your registered mobile number to continue.</p>
                </div>

                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-5">
                    <FormField
                      control={phoneForm.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="10-digit mobile number"
                              type="tel"
                              maxLength={10}
                              className="h-12 text-base"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                field.onChange(val);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2.5">
                      <Button
                        type="submit"
                        className="w-full h-12 text-sm sm:text-base rounded-lg"
                        disabled={sendOtpMutation.isPending || phoneForm.watch("mobile").length !== 10}
                      >
                        {sendOtpMutation.isPending && sentChannel === "sms" ? (
                          "Sending..."
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4 mr-2" />
                            Send OTP via SMS
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 text-sm sm:text-base rounded-lg border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/5 hover:border-[#25D366]/60"
                        disabled={sendOtpMutation.isPending || phoneForm.watch("mobile").length !== 10}
                        onClick={onPhoneWhatsapp}
                      >
                        {sendOtpMutation.isPending && sentChannel === "whatsapp" ? (
                          "Sending..."
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
                            Send OTP via WhatsApp
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>

                <div className="mt-8 pt-8 border-t text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-primary font-medium hover:underline">
                      Register your clinic
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => { setStep(1); setDevOtp(null); }}
                  className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>

                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">Verify OTP</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    6-digit code sent to{" "}
                    <span className="font-medium text-foreground">{mobile}</span>{" "}
                    via{" "}
                    <span className="font-medium" style={{ color: sentChannel === "whatsapp" ? "#25D366" : undefined }}>
                      {sentChannel === "whatsapp" ? "WhatsApp" : "SMS"}
                    </span>
                  </p>
                </div>

                {/* Dev mode OTP banner */}
                {devOtp && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Dev Mode — OTP Code</p>
                      <p className="text-xl font-mono font-bold tracking-widest text-amber-900 mt-0.5">{devOtp}</p>
                    </div>
                  </motion.div>
                )}

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup className="w-full justify-between gap-1 sm:gap-2">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <InputOTPSlot
                                    key={i}
                                    index={i}
                                    className="flex-1 h-12 sm:h-14 text-base sm:text-xl rounded-md border-border"
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
                      className="w-full h-12 text-sm sm:text-base rounded-lg"
                      disabled={verifyOtpMutation.isPending || otpForm.watch("otp").length !== 6}
                    >
                      {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                  </form>
                </Form>

                <OtpResendTimer
                  mobile={mobile}
                  isPending={sendOtpMutation.isPending}
                  onResendSms={handleResendSms}
                  onResendWhatsapp={handleResendWhatsapp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side — Visual */}
      <div className="hidden lg:flex flex-1 relative bg-muted items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="max-w-md text-center relative z-10 p-12">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 text-primary shadow-inner">
            <HeartPulse className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Focus on Patients.</h2>
          <p className="text-muted-foreground text-lg">
            ClinicFlow handles the administrative friction, organizing appointments, patient records, and billing in one calm interface.
          </p>
        </div>
      </div>
    </div>
  );
}
