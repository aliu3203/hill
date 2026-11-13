// Hill sign-in, built on Amazon Cognito.
// Talks to Cognito's public API with plain fetch, so no SDK or build step is needed.
//
// Flow: signUp -> (Cognito emails a 6-digit code) -> confirmSignUp -> signIn.
// The UCLA-only rule is enforced on the server by the pre sign-up Lambda.
// The check in this file only gives faster feedback in the form.
(function () {
  const config = window.HILL_CONFIG || {};
  const enabled = Boolean(config.region && config.userPoolClientId);
  const endpoint = `https://cognito-idp.${config.region}.amazonaws.com/`;
  const allowedDomains = (config.allowedEmailDomains || ["ucla.edu", "g.ucla.edu"]).map((d) => d.toLowerCase());
  const STORAGE_KEY = "hill.session";
  const listeners = new Set();
  let memorySession = null;

  // ---- storage (localStorage can be blocked in private windows, so fall back to memory) ----
  function readSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : memorySession;
    } catch {
      return memorySession;
    }
  }
  function writeSession(session) {
    memorySession = session;
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* memory copy is enough */ }
    listeners.forEach((fn) => fn(getUser()));
  }

  // ---- helpers ----
  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }
  function isAllowedEmail(email) {
    const parts = normalizeEmail(email).split("@");
    return parts.length === 2 && Boolean(parts[0]) && allowedDomains.includes(parts[1]);
  }
  function decodeJwt(token) {
    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(atob(payload).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
      return JSON.parse(json);
    } catch {
      return {};
    }
  }

  // Turn Cognito's error codes into messages a student can act on.
  function friendlyError(type, message) {
    const text = String(message || "");
    switch (type) {
      case "UserLambdaValidationException":
        // Cognito wraps our Lambda's message as "PreSignUp failed with error <message>." (adds its own period).
        return text.replace(/^PreSignUp failed with error\s*/i, "").replace(/\.+\s*$/, "") + ".";
      case "UsernameExistsException":
        return "An account with this email already exists. Try signing in instead.";
      case "InvalidPasswordException":
        return "Password needs at least 8 characters, including a lowercase letter and a number.";
      case "CodeMismatchException":
        return "That code doesn't match. Check your email and try again.";
      case "ExpiredCodeException":
        return "That code has expired. Tap \"Resend code\" to get a new one.";
      case "NotAuthorizedException":
        return /already confirmed/i.test(text) ? "This email is already verified. You can sign in." : "Incorrect email or password.";
      case "UserNotFoundException":
        return "Incorrect email or password.";
      case "LimitExceededException":
      case "TooManyRequestsException":
      case "TooManyFailedAttemptsException":
        return "Too many attempts. Please wait a few minutes and try again.";
      case "CodeDeliveryFailureException":
        return "We couldn't send the email right now. Please try again shortly.";
      case "InvalidParameterException":
        return text || "Please check the details you entered.";
      default:
        return text || "Something went wrong. Please try again.";
    }
  }

  class AuthError extends Error {
    constructor(type, message) {
      super(friendlyError(type, message));
      this.code = type;
    }
  }

  async function cognito(action, body) {
    if (!enabled) throw new AuthError("NotConfigured", "Sign-in isn't set up yet.");
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
          "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AuthError("Network", "Can't reach the sign-in service. Check your connection.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const type = String(data.__type || "").split("#").pop();
      throw new AuthError(type, data.message || data.Message);
    }
    return data;
  }

  function saveTokens(result, previous) {
    const session = {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken || previous?.refreshToken,
      expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000,
    };
    writeSession(session);
    return session;
  }

  // ---- public API ----
  async function signUp({ email, password, name }) {
    const username = normalizeEmail(email);
    if (!isAllowedEmail(username)) {
      throw new AuthError("InvalidParameterException", `Hill is for UCLA students. Use your ${allowedDomains.map((d) => "@" + d).join(" or ")} email.`);
    }
    const attributes = [{ Name: "email", Value: username }];
    if (name && name.trim()) attributes.push({ Name: "given_name", Value: name.trim().slice(0, 60) });
    const result = await cognito("SignUp", {
      ClientId: config.userPoolClientId,
      Username: username,
      Password: password,
      UserAttributes: attributes,
    });
    return { confirmed: Boolean(result.UserConfirmed), sentTo: result.CodeDeliveryDetails?.Destination || username };
  }

  async function confirmSignUp({ email, code }) {
    await cognito("ConfirmSignUp", {
      ClientId: config.userPoolClientId,
      Username: normalizeEmail(email),
      ConfirmationCode: String(code || "").trim(),
    });
  }

  async function resendCode(email) {
    const result = await cognito("ResendConfirmationCode", {
      ClientId: config.userPoolClientId,
      Username: normalizeEmail(email),
    });
    return result.CodeDeliveryDetails?.Destination || normalizeEmail(email);
  }

  async function signIn({ email, password }) {
    const result = await cognito("InitiateAuth", {
      ClientId: config.userPoolClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: normalizeEmail(email), PASSWORD: password },
    });
    if (!result.AuthenticationResult) throw new AuthError("Unsupported", "This account needs an extra sign-in step that Hill doesn't support yet.");
    saveTokens(result.AuthenticationResult);
    return getUser();
  }

  async function forgotPassword(email) {
    const result = await cognito("ForgotPassword", {
      ClientId: config.userPoolClientId,
      Username: normalizeEmail(email),
    });
    return result.CodeDeliveryDetails?.Destination || normalizeEmail(email);
  }

  async function confirmForgotPassword({ email, code, password }) {
    await cognito("ConfirmForgotPassword", {
      ClientId: config.userPoolClientId,
      Username: normalizeEmail(email),
      ConfirmationCode: String(code || "").trim(),
      Password: password,
    });
  }

  async function signOut() {
    const session = readSession();
    writeSession(null);
    if (session?.refreshToken && enabled) {
      // Best effort: invalidate the refresh token on Cognito's side too.
      cognito("RevokeToken", { ClientId: config.userPoolClientId, Token: session.refreshToken }).catch(() => {});
    }
  }

  // Returns a valid ID token, refreshing it if it's about to expire. Null when signed out.
  let refreshing = null;
  async function getIdToken() {
    const session = readSession();
    if (!session?.idToken) return null;
    if (Date.now() < session.expiresAt - 60_000) return session.idToken;
    if (!session.refreshToken) { writeSession(null); return null; }
    refreshing = refreshing || cognito("InitiateAuth", {
      ClientId: config.userPoolClientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: { REFRESH_TOKEN: session.refreshToken },
    }).then((result) => saveTokens(result.AuthenticationResult, session).idToken)
      .catch(() => { writeSession(null); return null; })
      .finally(() => { refreshing = null; });
    return refreshing;
  }

  // Who is signed in, read from the ID token. Null when signed out.
  function getUser() {
    const session = readSession();
    if (!session?.idToken) return null;
    const claims = decodeJwt(session.idToken);
    if (!claims.email) return null;
    return {
      id: claims.sub,
      email: claims.email,
      name: claims.given_name || claims.email.split("@")[0],
      emailVerified: claims.email_verified === true || claims.email_verified === "true",
    };
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  window.HillAuth = {
    enabled,
    allowedDomains,
    isAllowedEmail,
    signUp,
    confirmSignUp,
    resendCode,
    signIn,
    forgotPassword,
    confirmForgotPassword,
    signOut,
    getIdToken,
    getUser,
    onChange,
  };
})();
