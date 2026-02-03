"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  // Honeypot
  const [website, setWebsite] = useState("");

  // Timestamp for bot detection
  const loadedAt = useRef(0);
  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!name.trim()) {
      errors.name = "Ime je obavezno.";
    }

    if (!email.trim()) {
      errors.email = "Email je obavezan.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Unesite validnu email adresu.";
    }

    if (!message.trim()) {
      errors.message = "Poruka je obavezna.";
    } else if (message.trim().length < MIN_MESSAGE_LENGTH) {
      errors.message = `Poruka mora imati najmanje ${MIN_MESSAGE_LENGTH} karaktera.`;
    }

    return errors;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors(validate());
  };

  const showError = (field: keyof FieldErrors) => {
    return (submitted || touched[field]) && fieldErrors[field];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError("");

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
          _t: loadedAt.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setServerError(
          data.errors?.join(" ") || "Došlo je do greške."
        );
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
      setFieldErrors({});
      setTouched({});
      setSubmitted(false);
    } catch {
      setStatus("error");
      setServerError("Došlo je do greške. Proverite internet konekciju.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    `w-full rounded-lg border bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white shadow-sm outline-none transition-colors ${
      showError(field)
        ? "border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-gray-300 dark:border-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Ime */}
      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Ime <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (submitted || touched.name) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                if (e.target.value.trim()) delete next.name;
                else next.name = "Ime je obavezno.";
                return next;
              });
            }
          }}
          onBlur={() => handleBlur("name")}
          maxLength={100}
          placeholder="Vaše ime"
          className={inputClass("name")}
        />
        {showError("name") && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          type="text"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (submitted || touched.email) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                const val = e.target.value.trim();
                if (!val) next.email = "Email je obavezan.";
                else if (!EMAIL_REGEX.test(val))
                  next.email = "Unesite validnu email adresu.";
                else delete next.email;
                return next;
              });
            }
          }}
          onBlur={() => handleBlur("email")}
          maxLength={200}
          placeholder="vas@email.com"
          className={inputClass("email")}
        />
        {showError("email") && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
        )}
      </div>

      {/* Honeypot */}
      <div className="absolute opacity-0 -z-10 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Poruka */}
      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Poruka <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (submitted || touched.message) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                const len = e.target.value.trim().length;
                if (!len) next.message = "Poruka je obavezna.";
                else if (len < MIN_MESSAGE_LENGTH)
                  next.message = `Poruka mora imati najmanje ${MIN_MESSAGE_LENGTH} karaktera.`;
                else delete next.message;
                return next;
              });
            }
          }}
          onBlur={() => handleBlur("message")}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={5}
          placeholder="Vaša poruka..."
          className={`${inputClass("message")} resize-y`}
        />
        <div className="mt-1 flex items-center justify-between">
          {showError("message") ? (
            <p className="text-xs text-red-500">{fieldErrors.message}</p>
          ) : (
            <span />
          )}
          {message.length > 0 && (
            <p
              className={`text-xs ${
                message.trim().length < MIN_MESSAGE_LENGTH
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {message.trim().length} / {MAX_MESSAGE_LENGTH}
            </p>
          )}
        </div>
      </div>

      {/* Server error */}
      {status === "error" && serverError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
        </div>
      )}

      {/* Success */}
      {status === "success" && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
          <p className="text-sm text-green-600 dark:text-green-400">
            Poruka je uspešno poslata. Hvala na kontaktu!
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {isSubmitting ? "Slanje..." : "Pošalji poruku"}
      </button>
    </form>
  );
}
