"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AdminPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMessages = useCallback(async (p: number) => {
    if (!key) {
      setError("Pristup odbijen.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/messages?key=${encodeURIComponent(key)}&page=${p}`
      );
      if (!res.ok) {
        setError("Pristup odbijen.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMessages(data.messages);
      setPagination(data.pagination);
      setSelected(new Set());
    } catch {
      setError("Greška pri učitavanju poruka.");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    setLoading(true);
    fetchMessages(page);
  }, [fetchMessages, page]);

  const apiCall = async (method: string, body: object) => {
    if (!key) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/messages?key=${encodeURIComponent(key)}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchMessages(page);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRead = (ids: string[], read: boolean) => apiCall("PATCH", { ids, read });
  const deleteMessages = (ids: string[]) => apiCall("DELETE", { ids });
  const deleteAll = () => apiCall("DELETE", { all: true });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === messages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(messages.map((m) => m.id)));
    }
  };

  const selectedIds = Array.from(selected);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Poruke ({pagination?.total ?? 0})
          </h1>

          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.size > 0 && (
                <>
                  <button
                    onClick={() => toggleRead(selectedIds, true)}
                    disabled={actionLoading}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    Pročitano ({selected.size})
                  </button>
                  <button
                    onClick={() => toggleRead(selectedIds, false)}
                    disabled={actionLoading}
                    className="rounded-lg bg-gray-500 px-3 py-1.5 text-sm text-white hover:bg-gray-600 disabled:opacity-50 cursor-pointer"
                  >
                    Nepročitano ({selected.size})
                  </button>
                  <button
                    onClick={() => deleteMessages(selectedIds)}
                    disabled={actionLoading}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    Obriši ({selected.size})
                  </button>
                </>
              )}
              <button
                onClick={deleteAll}
                disabled={actionLoading}
                className="rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 cursor-pointer"
              >
                Obriši sve
              </button>
            </div>
          )}
        </div>

        {messages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Nema poruka.</p>
        ) : (
          <>
            {/* Select all */}
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === messages.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Izaberi sve na stranici
              </label>
            </div>

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-5 shadow-sm border transition-colors ${
                    msg.read
                      ? "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800"
                      : "bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-900 border-l-4 border-l-blue-500"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(msg.id)}
                      onChange={() => toggleSelect(msg.id)}
                      className="mt-1 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        <span className={`font-semibold ${msg.read ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}>
                          {msg.name}
                        </span>
                        <a
                          href={`mailto:${msg.email}`}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          {msg.email}
                        </a>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleString("sr-RS")}
                        </span>
                        {!msg.read && (
                          <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
                            novo
                          </span>
                        )}
                      </div>
                      <p className={`whitespace-pre-wrap ${msg.read ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}>
                        {msg.message}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => toggleRead([msg.id], !msg.read)}
                          disabled={actionLoading}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 cursor-pointer"
                        >
                          {msg.read ? "Označi kao nepročitano" : "Označi kao pročitano"}
                        </button>
                        <button
                          onClick={() => deleteMessages([msg.id])}
                          disabled={actionLoading}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                        >
                          Obriši
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 cursor-pointer"
                >
                  Prethodna
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 cursor-pointer"
                >
                  Sledeća
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
