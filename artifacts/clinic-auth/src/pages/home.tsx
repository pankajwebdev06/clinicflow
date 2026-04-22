import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Clock, HeartPulse, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary">
          <HeartPulse className="w-5 h-5 shrink-0" />
          <span className="font-bold text-lg tracking-tight text-foreground">ClinicFlow</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-medium rounded-full px-4 sm:px-6 text-xs sm:text-sm h-8 sm:h-9">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex-1 relative px-4 sm:px-6 py-10 sm:py-16 lg:py-20">
          {/* Background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-[50%] -left-[10%] w-[35%] h-[35%] rounded-full bg-blue-500/5 blur-3xl" />
          </div>

          <div className="max-w-5xl mx-auto w-full relative z-10">
            {/* Two-column on large screens, single column otherwise */}
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

              {/* Left — Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-start text-left"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Modern Clinic Management
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.18] mb-4 sm:mb-5">
                  Run your clinic with{" "}
                  <span className="text-primary">clarity and calm.</span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-lg">
                  Professional, streamlined software designed specifically for independent practices. Less time on admin, more time for patient care.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full rounded-full px-6 sm:px-8 h-12 text-sm sm:text-base shadow-lg shadow-primary/20">
                      Register Your Clinic
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full rounded-full px-6 sm:px-8 h-12 text-sm sm:text-base bg-background hover:bg-muted">
                      Log In to Dashboard
                    </Button>
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="mt-8 flex flex-wrap gap-4 sm:gap-6">
                  {[
                    { icon: Shield, label: "Secure & Safe" },
                    { icon: Clock, label: "Setup in 2 mins" },
                    { icon: Users, label: "Multi-Role Access" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right — Clinic Image (always visible, but layout changes) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="relative mt-6 lg:mt-0"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border bg-white aspect-[16/10] lg:aspect-[4/3]">
                  <img
                    src="/hero-clinic.jpg"
                    alt="Modern clinic waiting room"
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.style.background = "linear-gradient(135deg, hsl(185 75% 35% / 0.08) 0%, hsl(195 20% 96%) 100%)";
                        parent.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;padding:24px;text-align:center">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(185 75% 35%)" stroke-width="1.5" opacity="0.4"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                          <span style="color:hsl(215 15% 55%);font-size:14px;font-weight:500">Your Digital Clinic</span>
                        </div>`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

                  {/* Overlay badge — inside the image, safe from overflow */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/60 flex items-center gap-2">
                    <span className="text-yellow-500 text-sm">★</span>
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">Trusted by 500+ Clinics</span>
                  </div>

                  {/* Bottom overlay badge — also inside */}
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/60 flex items-center gap-3">
                    <div className="w-7 h-7 bg-green-500/15 rounded-full flex items-center justify-center text-green-600 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-none">Clinic Registered</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Ready for patients</p>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* Footer strip */}
        <div className="border-t border-border/50 bg-card/50 px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Designed for General Physicians, Pediatricians, Dentists, and Specialists — all in one platform
          </p>
        </div>
      </main>
    </div>
  );
}
