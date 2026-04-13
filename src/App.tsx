import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Services from "./pages/Services";
import Packages from "./pages/Packages";
import Appointments from "./pages/Appointments";
import Team from "./pages/Team";
import Messages from "./pages/Messages";
import PublicBooking from "./pages/PublicBooking";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ResetPassword from "./pages/ResetPassword";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Suppliers from "./pages/Suppliers";
import Finance from "./pages/Finance";
import CashFlow from "./pages/CashFlow";
import BusinessHoursPage from "./pages/BusinessHours";
import StaffManagement from "./pages/StaffManagement";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, onboardingCompleted, profile } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && profile.role === 'admin' && onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, onboardingCompleted } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && profile.role === 'admin' && onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
  if (profile && profile.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Auth />;
}

function OnboardingRoute() {
  const { user, loading, profile, onboardingCompleted } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingCompleted === true) return <Navigate to="/dashboard" replace />;
  return <Onboarding />;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false} storageKey="floresdesiao-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HashRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/termos" element={<TermsOfService />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/agendar/:slug" element={<PublicBooking />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<OnboardingRoute />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
              <Route path="/services" element={<AdminRoute><Services /></AdminRoute>} />
              <Route path="/packages" element={<AdminRoute><Packages /></AdminRoute>} />
              <Route path="/team" element={<AdminRoute><Team /></AdminRoute>} />
              <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="/suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
              <Route path="/finance" element={<AdminRoute><Finance /></AdminRoute>} />
              <Route path="/cash-flow" element={<AdminRoute><CashFlow /></AdminRoute>} />
              <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
              <Route path="/business-hours" element={<AdminRoute><BusinessHoursPage /></AdminRoute>} />
              <Route path="/staff-management" element={<AdminRoute><StaffManagement /></AdminRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;