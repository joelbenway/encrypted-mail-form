// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import * as openpgp from 'openpgp';
import {
  MAX_MESSAGE_LENGTH,
  MAX_KEY_LENGTH,
  EMAIL_REGEX,
  isCompletePgpKey,
} from './shared/index.js';

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export class RateLimiter {
  constructor(state, _env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip');
    if (!ip) {
      return new Response('Missing ip parameter', { status: 400 });
    }

    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;

    const timestamps = (await this.state.storage.get('timestamps')) || {};
    const ipTimestamps = (timestamps[ip] || []).filter(t => t > windowStart);

    if (ipTimestamps.length >= 5) {
      return new Response(JSON.stringify({ limited: true, remaining: 0 }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ipTimestamps.push(now);
    timestamps[ip] = ipTimestamps;

    // Clean up old IPs to prevent unbounded growth
    for (const [key, times] of Object.entries(timestamps)) {
      const recent = times.filter(t => t > windowStart);
      if (recent.length === 0) {
        delete timestamps[key];
      } else {
        timestamps[key] = recent;
      }
    }

    await this.state.storage.put('timestamps', timestamps);

    return new Response(JSON.stringify({ limited: false, remaining: 5 - ipTimestamps.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/send-email') {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimiterId = env.RATE_LIMITER.idFromName('global');
    const rateLimiter = env.RATE_LIMITER.get(rateLimiterId);
    const rateLimitResponse = await rateLimiter.fetch(
      `https://internal/rate-limit?ip=${encodeURIComponent(clientIp)}`
    );
    const rateLimitData = await rateLimitResponse.json();

    if (rateLimitData.limited) {
      return jsonResponse({ error: 'Too many requests, please try again later' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    if (body === null || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const senderPublicKey =
      typeof body.senderPublicKey === 'string' ? body.senderPublicKey.trim() : '';

    if (!email || !message) {
      return jsonResponse({ error: 'Missing required fields: email and message' }, 400);
    }

    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse({ error: 'Message too long' }, 400);
    }

    if (senderPublicKey.length > MAX_KEY_LENGTH) {
      return jsonResponse({ error: 'PGP key too large' }, 400);
    }

    if (
      !env.RECIPIENT_PUBLIC_KEY ||
      !env.RECIPIENT_EMAIL ||
      !env.RESEND_API_KEY ||
      !env.FROM_EMAIL
    ) {
      return jsonResponse({ error: 'Server configuration error: missing secrets' }, 500);
    }

    try {
      const plainTextContent = `Sender: ${email}\nDate: ${new Date().toISOString()}\n\n--- Message Body ---\n${message}`;

      const publicKey = await openpgp.readKey({
        armoredKey: env.RECIPIENT_PUBLIC_KEY,
      });

      const encryptedMessage = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: plainTextContent }),
        encryptionKeys: publicKey,
      });

      const resendPayload = {
        from: `Secure Contact Form <${env.FROM_EMAIL}>`,
        to: [env.RECIPIENT_EMAIL],
        reply_to: [email],
        subject: `[Encrypted Contact Form] Message from ${email}`,
        text: encryptedMessage,
      };

      if (isCompletePgpKey(senderPublicKey)) {
        resendPayload.attachments = [
          {
            filename: 'sender-key.asc',
            content: btoa(senderPublicKey),
            content_type: 'application/pgp-keys',
          },
        ];
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendPayload),
      });

      if (!resendResponse.ok) {
        const resendErr = await resendResponse.text();
        console.error('Resend API error:', resendErr);
        return jsonResponse({ error: 'Failed to deliver email' }, 502);
      }

      return jsonResponse({ success: true, message: 'Encrypted message sent successfully' }, 200);
    } catch (err) {
      console.error('Worker encryption/send error:', err);
      return jsonResponse({ error: 'Internal server error processing encrypted email' }, 500);
    }
  },
};

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
