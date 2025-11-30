import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import CookieConsent from "./components/CookieConsent";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Brew from "./pages/Brew";
import BrewHistory from "./pages/BrewHistory";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Grinders from "./pages/Grinders";
import Brewers from "./pages/Brewers";
import Recipes from "./pages/Recipes";
import CoffeeBeans from "./pages/CoffeeBeans";
import BrewComparison from "./pages/BrewComparison";
import BrewTimer from "./pages/BrewTimer";
import BrewTemplates from "./pages/BrewTemplates";
import Inventory from "./pages/Inventory";
import CoffeeServers from "./pages/CoffeeServers";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useApp();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/grinders"
              element={
                <ProtectedRoute>
                  <Grinders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/brewers"
              element={
                <ProtectedRoute>
                  <Brewers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/recipes"
              element={
                <ProtectedRoute>
                  <Recipes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/beans"
              element={
                <ProtectedRoute>
                  <CoffeeBeans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/servers"
              element={
                <ProtectedRoute>
                  <CoffeeServers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brew"
              element={
                <ProtectedRoute>
                  <Brew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <BrewHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comparison"
              element={
                <ProtectedRoute>
                  <BrewComparison />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brew-timer"
              element={
                <ProtectedRoute>
                  <BrewTimer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brew-templates"
              element={
                <ProtectedRoute>
                  <BrewTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="/contact"
              element={
                <ProtectedRoute>
                  <Contact />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
