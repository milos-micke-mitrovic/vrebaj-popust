import { getCloudflareContext } from "@opennextjs/cloudflare";

// Notify address for contact-form submissions.
const NOTIFY_TO = "m1ck33kc1m@gmail.com";
const NOTIFY_FROM = "kontakt@vrebajpopust.rs";

/**
 * Email the site owner when someone submits the contact form, via the Cloudflare
 * `send_email` binding (CONTACT_EMAIL in wrangler.jsonc → verified Email Routing
 * destination). Best-effort: never throws, so a mail failure can't fail the form
 * submission (the message is already saved to D1). No-op on Node/dev (no binding).
 */
export async function notifyContact(name: string, email: string, message: string): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const binding = (env as any).CONTACT_EMAIL;
    if (!binding) return; // no send_email binding (local Node/dev) → skip

    // cloudflare:email is a workerd built-in — import at runtime only (webpackIgnore
    // keeps the Node build from trying to resolve it).
    const { EmailMessage } = await import(/* webpackIgnore: true */ "cloudflare:email");
    const { createMimeMessage } = await import("mimetext");

    const mime = createMimeMessage();
    mime.setSender({ name: "VrebajPopust — kontakt forma", addr: NOTIFY_FROM });
    mime.setRecipient(NOTIFY_TO);
    mime.setSubject(`Nova poruka sa sajta: ${name}`);
    mime.addMessage({
      contentType: "text/plain",
      data: `Ime: ${name}\nEmail: ${email}\n\nPoruka:\n${message}`,
    });

    await binding.send(new EmailMessage(NOTIFY_FROM, NOTIFY_TO, mime.asRaw()));
  } catch (err) {
    console.error("contact email notification failed:", err);
  }
}
