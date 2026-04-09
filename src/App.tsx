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
import OrientationManagement from "./pages/OrientationManagement";
import OrientationViewer from "./pages/OrientationViewer";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import CaregiverOrientation from "./pages/CaregiverOrientation";
import CaregiverMyProfile from "./pages/CaregiverMyProfile";

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
            
            {/* Admin-only routes */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={["admin"]}><Clients /></ProtectedRoute>} />
            <Route path="/clients/new" element={<ProtectedRoute allowedRoles={["admin"]}><ClientNew /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute allowedRoles={["admin"]}><ClientProfile /></ProtectedRoute>} />
            <Route path="/scheduling" element={<ProtectedRoute allowedRoles={["admin"]}><Scheduling /></ProtectedRoute>} />
            <Route path="/caregivers" element={<ProtectedRoute allowedRoles={["admin"]}><Caregivers /></ProtectedRoute>} />
            <Route path="/caregivers/:id" element={<ProtectedRoute allowedRoles={["admin"]}><CaregiverProfile /></ProtectedRoute>} />
            <Route path="/nurses" element={<ProtectedRoute allowedRoles={["admin"]}><Nurses /></ProtectedRoute>} />
            <Route path="/nurses/:id" element={<ProtectedRoute allowedRoles={["admin"]}><NurseProfile /></ProtectedRoute>} />
            <Route path="/communications" element={<ProtectedRoute allowedRoles={["admin"]}><Communications /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><Analytics /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute allowedRoles={["admin"]}><Compliance /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Settings /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><Notifications /></ProtectedRoute>} />
            <Route path="/lms/training" element={<ProtectedRoute allowedRoles={["admin"]}><LmsTraining /></ProtectedRoute>} />
            <Route path="/lms/policies" element={<ProtectedRoute allowedRoles={["admin"]}><LmsPolicies /></ProtectedRoute>} />
            <Route path="/monthly-calendars" element={<ProtectedRoute allowedRoles={["admin"]}><MonthlyCalendars /></ProtectedRoute>} />
            <Route path="/lms/orientation" element={<ProtectedRoute allowedRoles={["admin"]}><OrientationManagement /></ProtectedRoute>} />
            <Route path="/lms/orientation/:id" element={<ProtectedRoute allowedRoles={["admin"]}><OrientationViewer /></ProtectedRoute>} />
            
            {/* Caregiver routes */}
            <Route path="/my-dashboard" element={<ProtectedRoute allowedRoles={["caregiver"]}><CaregiverDashboard /></ProtectedRoute>} />
            <Route path="/my-orientation" element={<ProtectedRoute allowedRoles={["caregiver"]}><CaregiverOrientation /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute allowedRoles={["caregiver"]}><CaregiverMyProfile /></ProtectedRoute>} />
            <Route path="/my-communications" element={<ProtectedRoute allowedRoles={["caregiver"]}><Communications /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
