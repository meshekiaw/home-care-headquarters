import { Link } from "react-router-dom";

interface LegalFooterProps {
  className?: string;
}

export default function LegalFooter({ className = "" }: LegalFooterProps) {
  return (
    <footer className={`border-t border-border mt-8 py-6 ${className}`}>
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Home Care Network. All rights reserved.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/privacy-policy" className="hover:text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <Link to="/hipaa-notice" className="hover:text-foreground underline-offset-4 hover:underline">
            HIPAA Notice of Privacy Practices
          </Link>
          <a href="mailto:meshekiaw@gmail.com" className="hover:text-foreground underline-offset-4 hover:underline">
            meshekiaw@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
