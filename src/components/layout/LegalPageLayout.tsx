import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import LegalFooter from "./LegalFooter";

interface LegalPageLayoutProps {
  title: string;
  subtitle?: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, subtitle, effectiveDate, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-dvh bg-muted/30 flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">Home Care Network</p>
            <p className="text-xs text-muted-foreground truncate">Privacy &amp; Compliance</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        <p className="text-xs text-muted-foreground mt-2">Effective date: {effectiveDate}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">{children}</div>
      </main>

      <LegalFooter className="bg-card" />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
