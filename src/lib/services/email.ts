// Transactional email for the auth flows (new-account temporary password,
// password-reset codes). Brevo is already part of Word on the Street's
// stack (CRM/email marketing), so this calls Brevo's transactional email
// API directly.
//
// Ships MOCK by default (EMAIL_MOCK=true, same as INGRAM_MOCK/BASIL_MOCK)
// so the whole auth flow works end-to-end without a Brevo API key: a
// mocked "send" is logged to the server console, and the Users admin page
// shows the generated password directly instead of relying on an email
// that was never really sent. Flip EMAIL_MOCK=false and set BREVO_API_KEY
// / BREVO_SENDER_EMAIL once ready to send for real — see
// src/lib/services/ingram.ts for the same swappable-mock pattern.

import "server-only";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export function isEmailMockEnabled(): boolean {
  return process.env.EMAIL_MOCK !== "false";
}

async function sendMock(message: EmailMessage): Promise<void> {
  console.log(
    `[email:mock] would send to ${message.to} — "${message.subject}"\n${message.text}\n`
  );
}

async function sendViaBrevo(message: EmailMessage): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Word on the Street Books";

  if (!apiKey || !senderEmail) {
    throw new Error(
      "EMAIL_MOCK=false but BREVO_API_KEY/BREVO_SENDER_EMAIL are not set in .env — " +
        "fill both in, or set EMAIL_MOCK=true to use mock sending instead."
    );
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}

async function sendEmail(message: EmailMessage): Promise<void> {
  return isEmailMockEnabled() ? sendMock(message) : sendViaBrevo(message);
}

export async function sendNewAccountEmail(to: string, temporaryPassword: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your Word on the Street Books staff account",
    text:
      `An account was created for you on the Word on the Street Books order tool.\n\n` +
      `Email: ${to}\n` +
      `Temporary password: ${temporaryPassword}\n\n` +
      `Sign in and you'll be asked to choose your own password right away.`,
  });
}

export async function sendPasswordResetCodeEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your password reset code",
    text:
      `Use this code to reset your password on the Word on the Street Books order tool:\n\n` +
      `${code}\n\n` +
      `This code expires in 15 minutes. If you didn't request this, you can ignore this email.`,
  });
}

export async function sendPasswordResetByAdminEmail(
  to: string,
  temporaryPassword: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "Your password was reset",
    text:
      `A staff admin reset your password on the Word on the Street Books order tool.\n\n` +
      `Temporary password: ${temporaryPassword}\n\n` +
      `Sign in and you'll be asked to choose your own password right away.`,
  });
}
