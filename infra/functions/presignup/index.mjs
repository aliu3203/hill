// Cognito "pre sign-up" trigger.
// Cognito runs this before it creates any account. If we throw, the account
// is never created and no verification email is sent.

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "ucla.edu,g.ucla.edu")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

// True only for addresses like name@ucla.edu or name@g.ucla.edu.
// The domain must match exactly, so name@ucla.edu.fake.com is rejected.
export function isAllowedEmail(email) {
  const value = String(email ?? "").trim().toLowerCase();
  const parts = value.split("@");
  if (parts.length !== 2 || !parts[0]) return false;
  return allowedDomains.includes(parts[1]);
}

export async function handler(event) {
  const email = event.request?.userAttributes?.email;
  if (!isAllowedEmail(email)) {
    const list = allowedDomains.map((domain) => `@${domain}`).join(" or ");
    // Cognito shows this message to the app as "PreSignUp failed with error <message>".
    throw new Error(`Hill is for UCLA students. Please sign up with your ${list} email.`);
  }
  // Leave autoConfirmUser false so Cognito still emails a verification code.
  return event;
}
