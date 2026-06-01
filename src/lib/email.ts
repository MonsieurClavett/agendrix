import {
  renderNotificationEmailSubject,
  renderNotificationHref,
  renderNotificationLabel,
  type NotificationPayload,
} from "@/lib/notifications";

type InvitationEmailInput = {
  to: string;
  inviteeName: string;
  companyName: string;
  link: string;
  expiresAt: Date;
};

/**
 * Send an invitation email via Resend when `RESEND_API_KEY` is set.
 * Otherwise log the link to the server console and return
 * `delivered: false` — the calling Server Action surfaces the link
 * to the MANAGER in the result so the dev flow works end-to-end.
 */
export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<{ delivered: boolean }> {
  return sendEmail({
    to: input.to,
    subject: `Invitation à rejoindre ${input.companyName} sur Agendrix`,
    html: renderInvitationHtml(input),
    logTag: `invitation to=${input.to} link=${input.link}`,
  });
}

type SendNotificationEmailInput = {
  to: string;
  recipientName: string | null;
  payload: NotificationPayload;
};

/**
 * Send a notification email via Resend when configured. In dev
 * fallback mode, logs to console. Errors are swallowed by the
 * caller — this function only fails if Resend itself throws.
 */
export async function sendNotificationEmail(
  input: SendNotificationEmailInput,
): Promise<{ delivered: boolean }> {
  const subject = renderNotificationEmailSubject(input.payload);
  const label = renderNotificationLabel(input.payload);
  const href = renderNotificationHref(input.payload);
  const appUrl = (process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000").replace(/\/+$/, "");
  const link = href ? `${appUrl}${href}` : null;

  return sendEmail({
    to: input.to,
    subject,
    html: renderNotificationHtml({
      recipientName: input.recipientName,
      label,
      link,
    }),
    logTag: `notification email to=${input.to} type=${input.payload.type}${
      link ? ` link=${link}` : ""
    }`,
  });
}

/**
 * Internal helper. Sends via Resend when `RESEND_API_KEY` is set;
 * otherwise logs to console.
 */
async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  logTag: string;
}): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email dev fallback] ${input.logTag}`);
    return { delivered: false };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return { delivered: true };
}

function renderInvitationHtml(input: InvitationEmailInput): string {
  const expires = input.expiresAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const escapedName = escapeHtml(input.inviteeName);
  const escapedCompany = escapeHtml(input.companyName);
  return `
  <!DOCTYPE html>
  <html lang="fr">
    <body style="font-family: -apple-system, system-ui, sans-serif; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px;">Bienvenue ${escapedName} !</h2>
      <p style="line-height: 1.5;">
        Vous avez été invité·e à rejoindre <strong>${escapedCompany}</strong> sur Agendrix,
        l'outil de planification d'horaires de l'équipe.
      </p>
      <p style="line-height: 1.5;">
        Pour activer votre compte, cliquez sur le lien ci-dessous et choisissez un mot de passe.
        Le lien est valable jusqu'au <strong>${expires}</strong>.
      </p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${input.link}"
           style="background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Activer mon compte
        </a>
      </p>
      <p style="color: #555; font-size: 13px; line-height: 1.5;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br>
        <span style="word-break: break-all;">${input.link}</span>
      </p>
    </body>
  </html>`;
}

function renderNotificationHtml(input: {
  recipientName: string | null;
  label: string;
  link: string | null;
}): string {
  const greeting = input.recipientName
    ? `Bonjour ${escapeHtml(input.recipientName)},`
    : "Bonjour,";
  const escapedLabel = escapeHtml(input.label);
  const button = input.link
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 28px auto;">
        <tr>
          <td style="border-radius: 8px; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);">
            <a href="${input.link}"
               style="display: inline-block; padding: 12px 24px; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
              Ouvrir Agendrix →
            </a>
          </td>
        </tr>
      </table>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Agendrix</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f5f5f5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
            <tr>
              <td style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 20px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td>
                      <div style="display: inline-block; width: 32px; height: 32px; border-radius: 8px; background: #ffffff; color: #0891b2; text-align: center; line-height: 32px; font-weight: 700; font-size: 16px; margin-right: 10px; vertical-align: middle;">A</div>
                      <span style="color: #ffffff; font-size: 18px; font-weight: 600; vertical-align: middle;">Agendrix</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 28px 24px;">
                <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280; line-height: 1.5;">${greeting}</p>
                <p style="margin: 0; font-size: 16px; color: #111827; line-height: 1.6;">${escapedLabel}</p>
                ${button}
              </td>
            </tr>
            <tr>
              <td style="background: #f9fafb; padding: 16px 28px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                  Vous recevez cet email parce que vous êtes inscrit·e sur Agendrix —
                  l'outil de planification d'horaires de votre équipe.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
