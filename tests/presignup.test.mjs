// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { handler, isAllowedEmail } from "../infra/functions/presignup/index.mjs";

const signUpEvent = (email) => ({ triggerSource: "PreSignUp_SignUp", request: { userAttributes: { email } }, response: {} });

test("allows @ucla.edu and @g.ucla.edu", () => {
  assert.equal(isAllowedEmail("joebruin@ucla.edu"), true);
  assert.equal(isAllowedEmail("joebruin@g.ucla.edu"), true);
  assert.equal(isAllowedEmail("  JoeBruin@G.UCLA.EDU "), true);
});

test("rejects everything else", () => {
  for (const email of [
    "joe@gmail.com",
    "joe@usc.edu",
    "joe@ucla.edu.evil.com",
    "joe@notucla.edu",
    "joe@cs.ucla.edu",
    "joe@ucla.edu@gmail.com",
    "@ucla.edu",
    "ucla.edu",
    "",
    undefined,
  ]) {
    assert.equal(isAllowedEmail(email), false, `${email} should be rejected`);
  }
});

test("handler passes UCLA sign-ups through without auto-confirming", async () => {
  const result = await handler(signUpEvent("joebruin@g.ucla.edu"));
  assert.notEqual(result.response.autoConfirmUser, true);
  assert.notEqual(result.response.autoVerifyEmail, true);
});

test("handler blocks non-UCLA sign-ups with a friendly message", async () => {
  await assert.rejects(handler(signUpEvent("joe@gmail.com")), /UCLA students/);
});
