"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "./login";

interface AdminContentProps {
  children: React.ReactNode;
}

export function AdminContent({ children }: AdminContentProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for auth cookie
    const hasAuth = document.cookie.includes("admin_auth=1");
    setIsAuthenticated(hasAuth);
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginForm onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Authenticated - show content
  return <>{children}</>;
}
