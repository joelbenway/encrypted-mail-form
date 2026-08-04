// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import * as openpgp from 'openpgp';

const MAX_MESSAGE_LENGTH = 50000;
const MAX_KEY_LENGTH = 20000;
const MAX_REQUESTS_PER_HOUR = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requestTimestamps = new Map();

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestTimestamps.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_HOUR) {
    requestTimestamps.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestTimestamps.set(ip, recent);
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/send-email') {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(clientIp)) {
      return jsonResponse({ error: 'Too many requests, please try again later' }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const senderPublicKey = typeof body.senderPublicKey === 'string' ? body.senderPublicKey.trim() : '';

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

    if (!env.RECIPIENT_PUBLIC_KEY || !env.RECIPIENT_EMAIL || !env.RESEND_API_KEY) {
      return jsonResponse({ error: 'Server configuration error: missing secrets' }, 500);
    }

    try {
      const plainTextContent = `Sender: ${email}\nDate: ${new Date().toISOString()}\n\n--- Message Body ---\n${message}`;

      const publicKey = await openpgp.readKey({ armoredKey: env.RECIPIENT_PUBLIC_KEY });

      const encryptedMessage = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: plainTextContent }),
        encryptionKeys: publicKey
      });

      const resendPayload = {
        from: 'Secure Contact Form <onboarding@resend.dev>',
        to: [env.RECIPIENT_EMAIL],
        reply_to: [email],
        subject: `[Encrypted Contact Form] Message from ${email}`,
        text: encryptedMessage
      };

      if (senderPublicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
        resendPayload.attachments = [
          {
            filename: 'sender-key.asc',
            content: btoa(senderPublicKey),
            content_type: 'application/pgp-keys'
          }
        ];
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendPayload)
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
  }
};

// This file is part of joel.benway.me.
//
// joel.benway.me is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option) any
// later version.
//
// joel.benway.me is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
// details.
//
// You should have received a copy of the GNU General Public License along with
// joel.benway.me. If not, see <https://www.gnu.org/licenses/>.
