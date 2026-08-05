// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as openpgp from "openpgp";
import worker from "../src/worker.js";

const RECIPIENT_EMAIL = "test@example.com";
const SENDER_EMAIL = "sender@example.com";

let testPrivateKey;
let testPublicKey;
let fetchMock;
let ipCounter = 0;

beforeAll(async () => {
  const generated = await openpgp.generateKey({
    type: "ecc",
    curve: "ed25519",
    userIDs: [{ name: "Test Recipient", email: RECIPIENT_EMAIL }],
    format: "armored",
  });
  testPrivateKey = generated.privateKey;
  testPublicKey = generated.publicKey;

  fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-id" }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function makeEnv(overrides = {}) {
  return {
    RECIPIENT_PUBLIC_KEY: testPublicKey,
    RECIPIENT_EMAIL,
    RESEND_API_KEY: "test-resend-key",
    FROM_EMAIL: "secure@email.benway.me",
    ASSETS: { fetch: () => new Response("static asset", { status: 200 }) },
    ...overrides,
  };
}

function nextIp() {
  ipCounter += 1;
  return "10.0.0." + ipCounter;
}

function sendRequest(path, { method = "POST", body, ip, env } = {}) {
  const headers = { "CF-Connecting-IP": ip || nextIp() };
  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return worker.fetch(
    new Request("http://localhost" + path, init),
    env || makeEnv(),
    {},
  );
}

function validBody(overrides = {}) {
  return {
    email: SENDER_EMAIL,
    message: "Hello, this is a test message",
    senderPublicKey: testPublicKey,
    ...overrides,
  };
}

describe("routing", () => {
  it("serves static assets for non-API paths", async () => {
    const response = await sendRequest("/style.css", { method: "GET" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("static asset");
  });

  it("rejects non-POST requests to the API with 405", async () => {
    const response = await sendRequest("/api/send-email", { method: "GET" });
    expect(response.status).toBe(405);
  });
});

describe("request validation", () => {
  it("rejects an invalid JSON body with 400", async () => {
    const response = await sendRequest("/api/send-email", {
      body: "{not json",
    });
    expect(response.status).toBe(400);
  });

  it("rejects a null JSON body with 400", async () => {
    const response = await sendRequest("/api/send-email", {
      body: null,
    });
    expect(response.status).toBe(400);
  });

  it("rejects a non-object JSON body with 400", async () => {
    const response = await sendRequest("/api/send-email", {
      body: "just a string",
    });
    expect(response.status).toBe(400);
  });

  it("rejects a request with missing fields", async () => {
    const response = await sendRequest("/api/send-email", {
      body: { email: SENDER_EMAIL },
    });
    expect(response.status).toBe(400);
  });

  it("rejects a malformed email address", async () => {
    const response = await sendRequest("/api/send-email", {
      body: validBody({ email: "not-an-email" }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects a message over the size limit", async () => {
    const response = await sendRequest("/api/send-email", {
      body: validBody({ message: "x".repeat(50001) }),
    });
    expect(response.status).toBe(400);
  });
});

describe("server configuration", () => {
  it("returns 500 when secrets are missing", async () => {
    const env = makeEnv({ RECIPIENT_PUBLIC_KEY: undefined });
    const response = await sendRequest("/api/send-email", {
      body: validBody(),
      env,
    });
    expect(response.status).toBe(500);
  });
});

describe("encryption and delivery", () => {
  it("encrypts the message and sends it to the recipient via Resend", async () => {
    fetchMock.mockClear();
    const response = await sendRequest("/api/send-email", {
      body: validBody(),
    });
    expect(response.status).toBe(200);

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(init.headers.Authorization).toBe("Bearer test-resend-key");
    expect(payload.to).toEqual([RECIPIENT_EMAIL]);
    expect(payload.from).toBe("Secure Contact Form <secure@email.benway.me>");

    const decrypted = await openpgp.decrypt({
      message: await openpgp.readMessage({ armoredMessage: payload.text }),
      decryptionKeys: await openpgp.readPrivateKey({
        armoredKey: testPrivateKey,
      }),
    });
    expect(decrypted.data).toContain("Sender: " + SENDER_EMAIL);
    expect(decrypted.data).toContain("Hello, this is a test message");
  });

  it("attaches the sender PGP key as sender-key.asc", async () => {
    fetchMock.mockClear();
    await sendRequest("/api/send-email", { body: validBody() });
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments[0].filename).toBe("sender-key.asc");
    expect(payload.attachments[0].content_type).toBe("application/pgp-keys");
    expect(
      Buffer.from(payload.attachments[0].content, "base64").toString(),
    ).toBe(testPublicKey.trim());
  });

  it("sets reply_to to the sender email and omits the attachment when no key is given", async () => {
    fetchMock.mockClear();
    await sendRequest("/api/send-email", {
      body: validBody({ senderPublicKey: "" }),
    });
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.reply_to).toEqual([SENDER_EMAIL]);
    expect(payload.attachments).toBeUndefined();
  });

  it("returns 502 when Resend fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("rate limit", { status: 429 }),
    );
    const response = await sendRequest("/api/send-email", {
      body: validBody(),
    });
    expect(response.status).toBe(502);
  });
});

describe("rate limiting", () => {
  it("rejects a sixth request from the same IP within an hour", async () => {
    const ip = nextIp();
    fetchMock.mockClear();
    for (let i = 0; i < 5; i++) {
      const response = await sendRequest("/api/send-email", {
        body: validBody(),
        ip,
      });
      expect(response.status).toBe(200);
    }
    const blocked = await sendRequest("/api/send-email", {
      body: validBody(),
      ip,
    });
    expect(blocked.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

// This file is part of encrypted-email-form.
//
// encrypted-email-form is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option) any
// later version.
//
// encrypted-email-form is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY OR FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
// details.
//
// You should have received a copy of the GNU General Public License along with
// encrypted-email-form. If not, see <https://www.gnu.org/licenses/>.
