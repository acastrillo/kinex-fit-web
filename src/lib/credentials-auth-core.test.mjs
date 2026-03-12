import assert from "node:assert/strict";
import test from "node:test";

import {
  WEB_SIGNUP_RESPONSE_MESSAGE,
  createMobileCredentialsSignInResult,
  createMobileCredentialsSignUpResult,
  createWebCredentialsSignUpResult,
} from "./credentials-auth-core.ts";

function allowRateLimit() {
  return {
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60_000,
  };
}

test("mobile credentials sign-in returns the mobile token contract", async () => {
  const user = {
    id: "user-123",
    email: "user@example.com",
    passwordHash: "stored-hash",
    firstName: "Ada",
    lastName: "Lovelace",
    subscriptionTier: "core",
    onboardingCompleted: true,
  };

  const payload = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 900,
    tokenType: "Bearer",
    isNewUser: false,
    user: {
      id: user.id,
      email: user.email,
      firstName: "Ada",
      lastName: "Lovelace",
      subscriptionTier: "core",
      onboardingCompleted: true,
    },
  };

  let issued = false;

  const result = await createMobileCredentialsSignInResult(
    {
      body: {
        email: user.email,
        password: "Password1!",
      },
      ip: "203.0.113.10",
    },
    {
      checkRateLimit: async () => allowRateLimit(),
      getUserByEmail: async (email) => (email === user.email ? user : null),
      comparePassword: async (password, passwordHash) =>
        password === "Password1!" && passwordHash === "stored-hash",
      issueMobileAuthSession: async (receivedUser, options) => {
        issued = true;
        assert.equal(receivedUser.id, user.id);
        assert.deepEqual(options, {
          provider: "credentials",
          isNewUser: false,
        });
        return payload;
      },
    }
  );

  assert.equal(result.status, 200);
  assert.ok("accessToken" in result.body);
  assert.equal(result.body.accessToken, "access-token");
  assert.equal(result.body.refreshToken, "refresh-token");
  assert.equal(result.body.tokenType, "Bearer");
  assert.equal(result.body.isNewUser, false);
  assert.equal(result.body.user.id, user.id);
  assert.equal(issued, true);
});

test("mobile credentials sign-in rejects invalid passwords", async () => {
  const user = {
    id: "user-123",
    email: "user@example.com",
    passwordHash: "stored-hash",
  };

  const result = await createMobileCredentialsSignInResult(
    {
      body: {
        email: user.email,
        password: "WrongPassword1!",
      },
      ip: "203.0.113.11",
    },
    {
      checkRateLimit: async () => allowRateLimit(),
      getUserByEmail: async () => user,
      comparePassword: async () => false,
      issueMobileAuthSession: async () => {
        throw new Error("should not issue tokens for invalid credentials");
      },
    }
  );

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, {
    error: "Authentication failed",
    message: "Invalid email or password",
  });
});

test("mobile credentials signup creates a user and returns the mobile token contract", async () => {
  const payload = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 900,
    tokenType: "Bearer",
    isNewUser: true,
    user: {
      id: "new-user-123",
      email: "new@example.com",
      firstName: "Grace",
      lastName: "Hopper",
      subscriptionTier: "free",
      onboardingCompleted: false,
    },
  };

  let createdUser = null;
  let signupAlertCalls = 0;

  const result = await createMobileCredentialsSignUpResult(
    {
      body: {
        email: "new@example.com",
        password: "Password1!",
        firstName: "Grace",
        lastName: "Hopper",
      },
      ip: "203.0.113.12",
    },
    {
      checkRateLimit: async () => allowRateLimit(),
      hashPassword: async () => "hashed-password",
      getUserByEmail: async () => null,
      createUser: async (user) => {
        createdUser = {
          ...user,
          createdAt: "2026-03-11T12:00:00.000Z",
        };
        return createdUser;
      },
      issueMobileAuthSession: async (user, options) => {
        assert.equal(user.id, "new-user-123");
        assert.deepEqual(options, {
          provider: "credentials",
          isNewUser: true,
        });
        return payload;
      },
      onUserCreated: () => {
        signupAlertCalls += 1;
      },
      now: () => "2026-03-11T12:00:00.000Z",
      generateUserId: () => "new-user-123",
    }
  );

  assert.equal(result.status, 201);
  assert.ok("accessToken" in result.body);
  assert.equal(result.body.accessToken, "access-token");
  assert.equal(result.body.isNewUser, true);
  assert.equal(result.body.user.email, "new@example.com");
  assert.ok(createdUser);
  assert.equal(createdUser.passwordHash, "hashed-password");
  assert.deepEqual(createdUser.authProviders, {
    credentials: {
      sub: "new@example.com",
      linkedAt: "2026-03-11T12:00:00.000Z",
      email: "new@example.com",
    },
  });
  assert.equal(signupAlertCalls, 1);
});

test("web credentials signup preserves the legacy duplicate-email response", async () => {
  const existingUser = {
    id: "existing-user",
    email: "existing@example.com",
    passwordHash: "stored-hash",
  };

  let createUserCalls = 0;
  let hashed = false;

  const result = await createWebCredentialsSignUpResult(
    {
      body: {
        email: existingUser.email,
        password: "Password1!",
      },
      ip: "203.0.113.13",
    },
    {
      checkRateLimit: async () => allowRateLimit(),
      hashPassword: async () => {
        hashed = true;
        return "hashed-password";
      },
      getUserByEmail: async () => existingUser,
      createUser: async () => {
        createUserCalls += 1;
        return existingUser;
      },
    }
  );

  assert.equal(result.status, 201);
  assert.deepEqual(result.body, {
    success: true,
    message: WEB_SIGNUP_RESPONSE_MESSAGE,
  });
  assert.equal(hashed, true);
  assert.equal(createUserCalls, 0);
});
