import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Clock, HeartPulse, CheckCircle2, Users, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary">
          <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <span className="font-bold text-lg sm:text-xl tracking-tight text-foreground">ClinicFlow</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-medium rounded-full px-4 sm:px-6 text-xs sm:text-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 md:py-20">
          <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 md:gap-12 items-center relative z-10">

            {/* Left — Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-start text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Modern Clinic Management
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.15] mb-4 sm:mb-6">
                Run your clinic with{" "}
                <span className="text-primary">clarity and calm.</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-md leading-relaxed">
                Professional, streamlined software designed specifically for independent practices. Less time on admin, more time for patient care.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full rounded-full px-6 sm:px-8 text-sm sm:text-base h-12 sm:h-14 shadow-lg shadow-primary/20">
                    Register Your Clinic
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full rounded-full px-6 sm:px-8 text-sm sm:text-base h-12 sm:h-14 bg-background hover:bg-muted">
                    Log In to Dashboard
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-sm sm:max-w-md">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">Secure & Safe</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">Setup in 2 mins</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">Multi-Role</span>
                </div>
              </div>
            </motion.div>

            {/* Right — Visual Card (hidden on small screens) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative hidden sm:block"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 relative bg-white border border-border">
                <img
                  src="/hero-clinic.jpg"
                  alt="Modern clinic"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Fallback gradient when image fails */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center p-8">
                    <HeartPulse className="w-16 h-16 text-primary/40 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Your Digital Clinic</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-multiply" />
              </div>

              {/* Floating Cards */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-white p-3 sm:p-4 rounded-xl shadow-xl border border-border flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">Clinic Registered</p>
                  <p className="text-xs text-muted-foreground">Ready for patients</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -top-4 -right-4 bg-white p-3 rounded-xl shadow-xl border border-border flex items-center gap-2"
              >
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                <span className="text-xs font-bold text-foreground">Trusted by 500+ Clinics</span>
              </motion.div>
            </motion.div>

          </div>
        </div>

        {/* Bottom Feature Strip */}
        <div className="border-t border-border/50 bg-card/50 px-4 sm:px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs text-muted-foreground">
              Designed for General Physicians, Pediatricians, Dentists, and Specialists — all in one platform
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
