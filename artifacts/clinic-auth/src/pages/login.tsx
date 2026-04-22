import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { HeartPulse, ArrowRight, ArrowLeft } from "lucide-react";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
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

  const onPhoneSubmit = (values: z.infer<typeof phoneSchema>) => {
    sendOtpMutation.mutate({
      data: { mobile: values.mobile, purpose: "login" }
    }, {
      onSuccess: () => {
        setMobile(values.mobile);
        setStep(2);
        toast({ title: "OTP Sent", description: "Please check your mobile for the verification code." });
      },
      onError: (error) => {
        toast({ 
          variant: "destructive", 
          title: "Error", 
          description: error.error || "Failed to send OTP. This number might not be registered." 
        });
      }
    });
  };

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    verifyOtpMutation.mutate({
      data: { mobile, otp: values.otp }
    }, {
      onSuccess: (data) => {
        setToken(data.token);
        
        let redirectPath = "/";
        if (data.redirectTo === "doctor_dashboard") redirectPath = "/doctor";
        else if (data.redirectTo === "reception_dashboard") redirectPath = "/reception";
        else if (data.redirectTo === "admin_panel") redirectPath = "/admin";
        
        toast({ title: "Welcome back", description: `Logged in as ${data.user.role}` });
        
        // Use timeout to allow toast to show before unmounting
        setTimeout(() => setLocation(redirectPath), 500);
      },
      onError: (error) => {
        toast({ 
          variant: "destructive", 
          title: "Invalid OTP", 
          description: error.error || "The OTP entered is incorrect or expired." 
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Left side - Form */}
      <div className="w-full lg:w-[480px] flex flex-col relative z-10 bg-card shadow-2xl">
        <div className="p-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <HeartPulse className="w-6 h-6" />
            <span className="font-display font-bold text-xl tracking-tight text-foreground">ClinicFlow</span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 pb-20">
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
                  <h1 className="text-3xl font-display font-bold mb-2">Welcome back</h1>
                  <p className="text-muted-foreground">Enter your registered mobile number to continue.</p>
                </div>

                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
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
                              className="h-12 text-lg"
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
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base rounded-lg"
                      disabled={sendOtpMutation.isPending || phoneForm.watch("mobile").length !== 10}
                    >
                      {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
                      {!sendOtpMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
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
                  onClick={() => setStep(1)}
                  className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>

                <div className="mb-8">
                  <h1 className="text-3xl font-display font-bold mb-2">Verify OTP</h1>
                  <p className="text-muted-foreground">
                    We've sent a 6-digit code to <span className="font-medium text-foreground">{mobile}</span>.
                  </p>
                </div>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup className="w-full justify-between">
                                <InputOTPSlot index={0} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl rounded-md border-border" />
                                <InputOTPSlot index={1} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl rounded-md border-border" />
                                <InputOTPSlot index={2} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl rounded-md border-border" />
                                <InputOTPSlot index={3} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl rounded-md border-border" />
                                <InputOTPSlot index={4} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl rounded-md border-border" />
                                <InputOTPSlot index={5} className="w-12 h-14 sm:w-14 sm:h-16 text-lg sm:text-2xl rounded-md border-border" />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4">
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base rounded-lg"
                        disabled={verifyOtpMutation.isPending || otpForm.watch("otp").length !== 6}
                      >
                        {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Sign In"}
                      </Button>
                      
                      <div className="text-center">
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                          disabled={sendOtpMutation.isPending}
                          onClick={() => {
                            sendOtpMutation.mutate({ data: { mobile, purpose: "login" } }, {
                              onSuccess: () => toast({ description: "OTP resent successfully." })
                            });
                          }}
                        >
                          Resend Code
                        </button>
                      </div>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 relative bg-muted items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        {/* abstract pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="max-w-md text-center relative z-10 p-12">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 text-primary shadow-inner">
            <HeartPulse className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-semibold mb-4">Focus on Patients.</h2>
          <p className="text-muted-foreground text-lg">
            ClinicFlow handles the administrative friction, organizing appointments, patient records, and billing in one calm interface.
          </p>
        </div>
      </div>
    </div>
  );
}
