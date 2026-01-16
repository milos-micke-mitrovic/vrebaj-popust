"use client";

import { useState } from "react";

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Liverpool123") {
      // Set cookie for 24 hours
      document.cookie = `admin_auth=1; path=/admin; max-age=${60 * 60 * 24}`;
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg">
        <h1 className="text-xl font-bold text-white mb-4">Admin Login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          className={`w-full px-4 py-2 rounded bg-gray-700 text-white border ${
            error ? "border-red-500" : "border-gray-600"
          } focus:outline-none focus:border-blue-500`}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mt-2">Wrong password</p>}
        <button
          type="submit"
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
