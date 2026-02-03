"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, notFound } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

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

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const fetchMessages = useCallback(async (p: number) => {
    if (!key) {
      notFound();
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/messages?key=${encodeURIComponent(key)}&page=${p}`
      );
      if (!res.ok) {
        notFound();
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

  const markRead = (ids: string[], read: boolean) => apiCall("PATCH", { ids, read });

  const doDelete = (ids: string[]) => {
    apiCall("DELETE", { ids });
    setExpanded(null);
  };

  const doDeleteAll = () => {
    apiCall("DELETE", { all: true });
    setExpanded(null);
  };

  const confirmDelete = (ids: string[], label: string) => {
    setConfirm({
      isOpen: true,
      title: "Brisanje poruka",
      message: `Da li ste sigurni da želite da obrišete ${label}?`,
      onConfirm: () => {
        setConfirm((prev) => ({ ...prev, isOpen: false }));
        doDelete(ids);
      },
    });
  };

  const confirmDeleteAll = () => {
    setConfirm({
      isOpen: true,
      title: "Brisanje svih poruka",
      message: `Da li ste sigurni da želite da obrišete sve poruke (${pagination?.total ?? 0})?`,
      onConfirm: () => {
        setConfirm((prev) => ({ ...prev, isOpen: false }));
        doDeleteAll();
      },
    });
  };

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

  const handleExpand = (msg: Message) => {
    if (expanded === msg.id) {
      setExpanded(null);
      return;
    }
    setExpanded(msg.id);
    if (!msg.read) {
      markRead([msg.id], true);
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
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Poruke ({pagination?.total ?? 0})
          </h1>

          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.size > 0 && (
                <>
                  <button
                    onClick={() => markRead(selectedIds, true)}
                    disabled={actionLoading}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    Pročitano ({selected.size})
                  </button>
                  <button
                    onClick={() => markRead(selectedIds, false)}
                    disabled={actionLoading}
                    className="rounded-lg bg-gray-500 px-2.5 py-1 text-xs text-white hover:bg-gray-600 disabled:opacity-50 cursor-pointer"
                  >
                    Nepročitano ({selected.size})
                  </button>
                  <button
                    onClick={() =>
                      confirmDelete(
                        selectedIds,
                        selected.size === 1
                          ? "ovu poruku"
                          : `${selected.size} poruka/e`
                      )
                    }
                    disabled={actionLoading}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    Obriši ({selected.size})
                  </button>
                </>
              )}
              <button
                onClick={confirmDeleteAll}
                disabled={actionLoading}
                className="rounded-lg border border-red-300 dark:border-red-800 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 cursor-pointer"
              >
                Obriši sve
              </button>
            </div>
          )}
        </div>

        {messages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nema poruka.</p>
        ) : (
          <>
            {/* List */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              {/* Select all header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <input
                  type="checkbox"
                  checked={selected.size === messages.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Izaberi sve
                </span>
              </div>

              {messages.map((msg, i) => (
                <div key={msg.id}>
                  {/* Compact row */}
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      i < messages.length - 1 && expanded !== msg.id
                        ? "border-b border-gray-100 dark:border-gray-800/50"
                        : ""
                    }`}
                    onClick={() => handleExpand(msg)}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(msg.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(msg.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0"
                    />

                    {!msg.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}

                    <span
                      className={`text-sm truncate w-28 flex-shrink-0 ${
                        msg.read
                          ? "text-gray-400 dark:text-gray-500"
                          : "font-semibold text-gray-900 dark:text-white"
                      }`}
                    >
                      {msg.name}
                    </span>

                    <span
                      className={`text-sm truncate flex-1 ${
                        msg.read
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {msg.message}
                    </span>

                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                      {new Date(msg.createdAt).toLocaleDateString("sr-RS")}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {expanded === msg.id && (
                    <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800/30 border-y border-gray-200 dark:border-gray-800">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {msg.name}
                        </span>
                        <a
                          href={`mailto:${msg.email}`}
                          className="text-red-500 hover:text-red-600"
                        >
                          {msg.email}
                        </a>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleString("sr-RS")}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-3">
                        {msg.message}
                      </p>

                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead([msg.id], !msg.read);
                          }}
                          disabled={actionLoading}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 cursor-pointer"
                        >
                          {msg.read ? "Označi kao nepročitano" : "Označi kao pročitano"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete([msg.id], "ovu poruku");
                          }}
                          disabled={actionLoading}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                        >
                          Obriši
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
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

      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText="Obriši"
        cancelText="Otkaži"
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
