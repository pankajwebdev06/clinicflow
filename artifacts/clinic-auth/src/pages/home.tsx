import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Clock, HeartPulse, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary">
          <HeartPulse className="w-6 h-6" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">ClinicFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/register">
            <Button size="sm" className="font-medium rounded-full px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-6 py-12 md:py-24">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Modern Clinic Management
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Run your clinic with <span className="text-primary">clarity and calm.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed">
              Professional, streamlined software designed specifically for independent practices. Less time on admin, more time for patient care.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 text-base h-14 shadow-lg shadow-primary/20">
                  Register Your Clinic
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 text-base h-14 bg-background hover:bg-muted">
                  Log In to Dashboard
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-foreground">Setup in 2 mins</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 relative bg-white border border-border">
              <img 
                src="/hero-clinic.jpg" 
                alt="Modern clinic interior" 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-multiply" />
            </div>
            
            {/* Floating UI Elements */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-border flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Clinic Registered</p>
                <p className="text-xs text-muted-foreground">Ready for patients</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
