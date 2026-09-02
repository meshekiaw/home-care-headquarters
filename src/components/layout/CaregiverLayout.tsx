import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BookOpen,
  ClipboardList,
  User,
  MessageSquare,
  LogOut,
  Home,
  GraduationCap,
  Menu,
} from "lucide-react";
import LegalFooter from "@/components/layout/LegalFooter";

const navItems = [
  { label: "Home", icon: Home, path: "/my-dashboard" },
  { label: "My Application", icon: ClipboardList, path: "/my-application" },
  { label: "My Orientation", icon: BookOpen, path: "/my-orientation" },
  { label: "My Training", icon: GraduationCap, path: "/my-training" },
  { label: "My Profile", icon: User, path: "/my-profile" },
  { label: "Communications", icon: MessageSquare, path: "/my-communications" },
];

export default function CaregiverLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base sm:text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-3 py-2">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="h-11 w-11">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="p-4 border-b">
              <h1 className="text-lg font-bold text-primary">My Portal</h1>
              <p className="text-xs text-muted-foreground">Caregiver Dashboard</p>
            </div>
            <NavList onNavigate={() => setMenuOpen(false)} />
            <div className="p-3 border-t shrink-0">
              <Button variant="ghost" className="w-full justify-start gap-2 h-11" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">My Portal</p>
          <p className="text-[11px] text-muted-foreground truncate">Home Care Headquarters</p>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-primary">My Portal</h1>
          <p className="text-xs text-muted-foreground">Caregiver Dashboard</p>
        </div>
        <NavList />
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 py-4 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
