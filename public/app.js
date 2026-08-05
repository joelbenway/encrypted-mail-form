// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FETCH_TIMEOUT_MS = 5000;
const PGP_BEGIN = "-----BEGIN PGP PUBLIC KEY BLOCK-----";
const PGP_END = "-----END PGP PUBLIC KEY BLOCK-----";

function isCompletePgpKey(key) {
  const trimmed = key.trim();
  return trimmed.startsWith(PGP_BEGIN) && trimmed.includes(PGP_END);
}

async function fetchFromKeysOpenPGP(email) {
  var controller = new AbortController();
  var timeout = setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    var response = await fetch(
      "https://keys.openpgp.org/vks/v1/by-email/" + encodeURIComponent(email),
      {
        signal: controller.signal,
      },
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (err) {
  } finally {
    clearTimeout(timeout);
  }
  return "";
}

async function fetchFromProtonMail(email) {
  var controller = new AbortController();
  var timeout = setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  try {
    var response = await fetch(
      "https://api.protonmail.ch/pks/lookup?op=get&search=" +
        encodeURIComponent(email),
      {
        signal: controller.signal,
      },
    );
    if (response.ok) {
      return await response.text();
    }
  } catch (err) {
  } finally {
    clearTimeout(timeout);
  }
  return "";
}

function lockKeyField(senderKeyInput) {
  if (isCompletePgpKey(senderKeyInput.value)) {
    senderKeyInput.readOnly = true;
    senderKeyInput.classList.add("key-locked");
  }
}

function unlockKeyField(senderKeyInput) {
  senderKeyInput.readOnly = false;
  senderKeyInput.classList.remove("key-locked");
}

function showStatus(statusBanner, text, type) {
  statusBanner.textContent = text;
  statusBanner.className = "status " + type;
}

function clearStatus(statusBanner) {
  statusBanner.textContent = "";
  statusBanner.className = "status hidden";
}

async function lookupPGPKey(
  email,
  senderKeyInput,
  statusBanner,
  lastCheckedEmailRef,
) {
  if (
    !email ||
    !EMAIL_REGEX.test(email) ||
    email === lastCheckedEmailRef.current
  )
    return;
  if (isCompletePgpKey(senderKeyInput.value)) return;
  var initialKeyValue = senderKeyInput.value;
  lastCheckedEmailRef.current = email;
  showStatus(statusBanner, "Looking up key\u2026", "info");
  var keyText = await fetchFromKeysOpenPGP(email);
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
    showStatus(statusBanner, "Key found and attached", "success");
  } else {
    clearStatus(statusBanner);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("contact-form");
  var emailInput = document.getElementById("sender-email");
  var messageInput = document.getElementById("message");
  var senderKeyInput = document.getElementById("sender-key");
  var statusBanner = document.getElementById("status-message");
  var submitBtn = document.getElementById("submit-btn");

  var lastCheckedEmailRef = { current: "" };

  senderKeyInput.addEventListener("input", function () {
    if (senderKeyInput.readOnly) return;
    lockKeyField(senderKeyInput);
  });

  emailInput.addEventListener("blur", function () {
    lookupPGPKey(
      emailInput.value.trim(),
      senderKeyInput,
      statusBanner,
      lastCheckedEmailRef,
    );
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearStatus(statusBanner);
    var email = emailInput.value.trim();
    var message = messageInput.value.trim();
    var senderKey = senderKeyInput.value.trim();
    if (!email || !message) {
      showStatus(statusBanner, "Email and message required", "error");
      return;
    }
    submitBtn.disabled = true;
    showStatus(statusBanner, "Encrypting and sending\u2026", "info");
    try {
      var response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          message: message,
          senderPublicKey: senderKey,
        }),
      });
      var data = await response.json();
      if (response.ok && data.success) {
        form.reset();
        lastCheckedEmailRef.current = "";
        showStatus(statusBanner, "Message sent encrypted", "success");
      } else {
        showStatus(statusBanner, data.error || "Failed to send", "error");
      }
    } catch (err) {
      showStatus(statusBanner, "Network error", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  form.addEventListener("reset", function () {
    clearStatus(statusBanner);
    unlockKeyField(senderKeyInput);
    lastCheckedEmailRef.current = "";
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
