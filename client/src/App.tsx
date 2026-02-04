import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import NewEntry from "@/pages/NewEntry";
import BusinessDetail from "@/pages/BusinessDetail";
import Transactions from "@/pages/Transactions";
import Alerts from "@/pages/Alerts";
import Banks from "@/pages/Banks";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/not-found";

function AuthRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={Login} />
    </Switch>
  );
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">DEEBI</h1>
          <p className="opacity-80">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthRoutes />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/new-entry" component={NewEntry} />
      <Route path="/business/:id" component={BusinessDetail} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/banks" component={Banks} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <ProtectedRoutes />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
