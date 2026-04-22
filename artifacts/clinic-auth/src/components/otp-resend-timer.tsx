import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, RefreshCw } from "lucide-react";

interface OtpResendTimerProps {
  mobile: string;
  isPending: boolean;
  onResendSms: () => void;
  onResendWhatsapp: () => void;
  initialSeconds?: number;
}

export function OtpResendTimer({
  mobile,
  isPending,
  onResendSms,
  onResendWhatsapp,
  initialSeconds = 30,
}: OtpResendTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    setSeconds(initialSeconds);
    setCanResend(false);
  }, [mobile, initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleResendSms = useCallback(() => {
    if (!canResend || isPending) return;
    setSeconds(initialSeconds);
    setCanResend(false);
    onResendSms();
  }, [canResend, isPending, initialSeconds, onResendSms]);

  const handleResendWhatsapp = useCallback(() => {
    if (!canResend || isPending) return;
    setSeconds(initialSeconds);
    setCanResend(false);
    onResendWhatsapp();
  }, [canResend, isPending, initialSeconds, onResendWhatsapp]);

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        {!canResend ? (
          <motion.p
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground"
          >
            Resend code in{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              00:{String(seconds).padStart(2, "0")}
            </span>
          </motion.p>
        ) : (
          <motion.p
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground"
          >
            Didn't receive the code?
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button
          type="button"
          onClick={handleResendSms}
          disabled={!canResend || isPending}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline transition-opacity"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Resend via SMS
        </button>

        <span className="text-muted-foreground/50 text-xs">|</span>

        <button
          type="button"
          onClick={handleResendWhatsapp}
          disabled={!canResend || isPending}
          className="inline-flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          style={{ color: canResend && !isPending ? "#25D366" : undefined }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Resend via WhatsApp
        </button>
      </div>
    </div>
  );
}
