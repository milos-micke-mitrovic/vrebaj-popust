import Link from "next/link";

export const TELEGRAM_URL = "https://t.me/vrebajpopust";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/**
 * On-site Telegram channel CTA — converts visitors (mostly one-time SEO arrivals)
 * into channel followers, the site's main retention lever. `target="_blank"` so it
 * opens Telegram without the visitor losing the page.
 */
export function TelegramCTA() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      <Link
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] p-6 shadow-lg transition-transform duration-300 hover:scale-[1.01] sm:flex-row"
      >
        <TelegramIcon className="h-12 w-12 shrink-0 text-white" />
        <div className="flex-1 text-center text-white sm:text-left">
          <h2 className="text-lg font-bold sm:text-xl">Ne propusti nijedan popust! 🔥</h2>
          <p className="mt-1 text-sm text-white/90">
            Prati naš Telegram kanal i dobij najveća sniženja preko 50% svaki dan — direktno na telefon.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-6 py-3 font-semibold text-[#229ED9] shadow transition-colors duration-300 group-hover:bg-gray-100">
          Pridruži se
        </span>
      </Link>
    </section>
  );
}

/** Compact inline Telegram link for the footer. */
export function TelegramFooterLink() {
  return (
    <Link
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1c8ec0]"
    >
      <TelegramIcon className="h-4 w-4" />
      Prati nas na Telegramu
    </Link>
  );
}
