// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import { EMAIL_REGEX, FETCH_TIMEOUT_MS, isCompletePgpKey } from './shared/index.js';

async function fetchFromKeysOpenPGP(email) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(email)}`,
      { signal: controller.signal }
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (err) {
    console.debug('keys.openpgp.org lookup failed:', err);
  } finally {
    clearTimeout(timeout);
  }
  return '';
}

async function fetchFromProtonMail(email) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://mail-api.proton.me/pks/lookup?op=get&search=${encodeURIComponent(email)}`,
      { signal: controller.signal }
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (err) {
    console.debug('ProtonMail lookup failed:', err);
  } finally {
    clearTimeout(timeout);
  }
  return '';
}

function lockKeyField(senderKeyInput) {
  if (isCompletePgpKey(senderKeyInput.value)) {
    senderKeyInput.readOnly = true;
    senderKeyInput.classList.add('key-locked');
  }
}

function unlockKeyField(senderKeyInput) {
  senderKeyInput.readOnly = false;
  senderKeyInput.classList.remove('key-locked');
}

function showStatus(statusBanner, text, type) {
  statusBanner.textContent = text;
  statusBanner.className = `status ${type}`;
}

function clearStatus(statusBanner) {
  statusBanner.textContent = '';
  statusBanner.className = 'status hidden';
}

async function lookupPGPKey(email, senderKeyInput, statusBanner, lastCheckedEmailRef) {
  if (!email || !EMAIL_REGEX.test(email) || email === lastCheckedEmailRef.current) return;
  if (isCompletePgpKey(senderKeyInput.value)) return;

  const initialKeyValue = senderKeyInput.value;
  lastCheckedEmailRef.current = email;
  showStatus(statusBanner, 'Looking up key…', 'info');

  let keyText = await fetchFromKeysOpenPGP(email);
  if (email !== lastCheckedEmailRef.current) return;
  if (senderKeyInput.value !== initialKeyValue) return;

  if (!isCompletePgpKey(keyText)) {
    keyText = await fetchFromProtonMail(email);
  }
  if (email !== lastCheckedEmailRef.current) return;
  if (senderKeyInput.value !== initialKeyValue) return;

  if (isCompletePgpKey(keyText)) {
    senderKeyInput.value = keyText;
    lockKeyField(senderKeyInput);
    showStatus(statusBanner, 'Key found and attached', 'success');
  } else {
    clearStatus(statusBanner);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const emailInput = document.getElementById('sender-email');
  const messageInput = document.getElementById('message');
  const senderKeyInput = document.getElementById('sender-key');
  const statusBanner = document.getElementById('status-message');
  const submitBtn = document.getElementById('submit-btn');

  const lastCheckedEmailRef = { current: '' };

  senderKeyInput.addEventListener('input', () => {
    if (senderKeyInput.readOnly) return;
    lockKeyField(senderKeyInput);
  });

  emailInput.addEventListener('input', () => {
    lastCheckedEmailRef.current = emailInput.value.trim();
  });

  emailInput.addEventListener('blur', () => {
    lookupPGPKey(emailInput.value.trim(), senderKeyInput, statusBanner, lastCheckedEmailRef);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearStatus(statusBanner);

    const email = emailInput.value.trim();
    const message = messageInput.value.trim();
    const senderKey = senderKeyInput.value.trim();

    if (!email || !message) {
      showStatus(statusBanner, 'Email and message required', 'error');
      return;
    }

    submitBtn.disabled = true;
    showStatus(statusBanner, 'Encrypting and sending…', 'info');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          message,
          senderPublicKey: senderKey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        form.reset();
        lastCheckedEmailRef.current = '';
        showStatus(statusBanner, 'Message sent encrypted', 'success');
      } else {
        showStatus(statusBanner, data.error || 'Failed to send', 'error');
      }
    } catch (err) {
      console.error('Send failed:', err);
      showStatus(statusBanner, 'Network error', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.addEventListener('reset', () => {
    clearStatus(statusBanner);
    unlockKeyField(senderKeyInput);
    lastCheckedEmailRef.current = '';
  });
});

export {
  lookupPGPKey,
  fetchFromKeysOpenPGP,
  fetchFromProtonMail,
  lockKeyField,
  unlockKeyField,
  showStatus,
  clearStatus,
  EMAIL_REGEX,
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
