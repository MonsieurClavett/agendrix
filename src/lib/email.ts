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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[invitation] dev fallback — to=${input.to} link=${input.link}`,
    );
    return { delivered: false };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Invitation à rejoindre ${input.companyName} sur Agendrix`,
    html: renderInvitationHtml(input),
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
