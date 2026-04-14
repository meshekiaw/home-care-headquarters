import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Users, 
  FileCheck, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Calendar,
    title: "Intelligent Scheduling",
    description: "AI-powered engine optimizes caregiver assignments based on skills, availability, and location.",
  },
  {
    icon: MessageSquare,
    title: "Communication Hub",
    description: "Centralized messaging, voice notes, and video calls for seamless coordination.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Real-time dashboards with actionable insights on efficiency and satisfaction.",
  },
  {
    icon: Users,
    title: "Client Management",
    description: "Comprehensive profiles with care plans, medical history, and service requirements.",
  },
  {
    icon: FileCheck,
    title: "Compliance Suite",
    description: "Automated certification tracking, visit verification, and audit-ready documentation.",
  },
];

const benefits = [
  { icon: Clock, text: "Save 15+ hours weekly on scheduling" },
  { icon: Shield, text: "100% compliance-ready documentation" },
  { icon: Zap, text: "Reduce scheduling conflicts by 90%" },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">HC</span>
            </div>
            <span className="font-semibold text-lg">Home Care Headquarters</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefits</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzQjgyRjYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary-foreground/90 text-sm mb-8 animate-fade-up">
              <Zap className="w-4 h-4" />
              <span>The future of home care operations</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Streamline Your{" "}
              <span className="text-primary">Home Care</span>{" "}
              Operations
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
              Eliminate scheduling conflicts, improve caregiver efficiency, and enhance client satisfaction with our all-in-one platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <Link to="/signup">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                Watch Demo
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-primary-foreground/60 text-sm animate-fade-up" style={{ animationDelay: "0.4s" }}>
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <benefit.icon className="w-4 h-4 text-success" />
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Gradient fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-primary">Succeed</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed specifically for home care agencies to streamline operations and deliver exceptional care.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-elevated transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
            
            {/* CTA Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex flex-col justify-center">
              <h3 className="text-xl font-semibold mb-2">Ready to transform your agency?</h3>
              <p className="text-primary-foreground/80 mb-4">Join hundreds of agencies already using Home Care Headquarters.</p>
              <Link to="/signup">
                <Button variant="secondary" className="w-fit">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 md:py-32 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Stop Losing Time to{" "}
                <span className="text-primary">Manual Processes</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Directors of Operations lose 15+ hours weekly on scheduling conflicts alone. Our platform automates the chaos and gives you back your time for strategic growth.
              </p>
              
              <div className="space-y-4">
                {[
                  "Eliminate double bookings with smart conflict detection",
                  "Match caregivers to clients by skills and location",
                  "Automate compliance documentation and tracking",
                  "Centralize all communications in one place",
                  "Get real-time insights into agency performance"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-success/20 p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl md:text-8xl font-bold text-primary mb-2">15+</div>
                  <div className="text-xl text-muted-foreground">Hours Saved Weekly</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Agency?
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Start your free trial today and see why leading home care agencies trust HomeCare Dashboard.
          </p>
          <Link to="/signup">
            <Button variant="hero" size="xl">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">HC</span>
              </div>
              <span className="font-semibold">Home Care Headquarters</span>
            </div>
            <p className="text-sidebar-foreground/60 text-sm">
              © 2024 Home Care Headquarters. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
