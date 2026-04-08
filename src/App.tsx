import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientNew from "./pages/ClientNew";
import ClientProfile from "./pages/ClientProfile";
import Scheduling from "./pages/Scheduling";
import Caregivers from "./pages/Caregivers";
import CaregiverProfile from "./pages/CaregiverProfile";
 import Nurses from "./pages/Nurses";
 import NurseProfile from "./pages/NurseProfile";
import Communications from "./pages/Communications";
import Analytics from "./pages/Analytics";
import Compliance from "./pages/Compliance";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import LmsTraining from "./pages/LmsTraining";
import LmsPolicies from "./pages/LmsPolicies";
import MonthlyCalendars from "./pages/MonthlyCalendars";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/clients/new" element={<ProtectedRoute><ClientNew /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
            <Route path="/scheduling" element={<ProtectedRoute><Scheduling /></ProtectedRoute>} />
            <Route path="/caregivers" element={<ProtectedRoute><Caregivers /></ProtectedRoute>} />
            <Route path="/caregivers/:id" element={<ProtectedRoute><CaregiverProfile /></ProtectedRoute>} />
             <Route path="/nurses" element={<ProtectedRoute><Nurses /></ProtectedRoute>} />
             <Route path="/nurses/:id" element={<ProtectedRoute><NurseProfile /></ProtectedRoute>} />
            <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/lms/training" element={<ProtectedRoute><LmsTraining /></ProtectedRoute>} />
            <Route path="/lms/policies" element={<ProtectedRoute><LmsPolicies /></ProtectedRoute>} />
            <Route path="/monthly-calendars" element={<ProtectedRoute><MonthlyCalendars /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
