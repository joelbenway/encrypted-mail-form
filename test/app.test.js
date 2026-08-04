// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { lookupPGPKey, fetchFromKeysOpenPGP, fetchFromProtonMail, lockKeyField, unlockKeyField, showStatus, clearStatus, EMAIL_REGEX } from '../public/app.js';
import './setup.js';

const PGP_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: test

test-key-data
-----END PGP PUBLIC KEY BLOCK-----`;

function createMockResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(body)
  };
}

function getElements() {
  return {
    senderKeyInput: document.getElementById('sender-key'),
    statusBanner: document.getElementById('status-message'),
    lastCheckedEmailRef: { current: '' }
  };
}

function resetInputs() {
  const keyInput = document.getElementById('sender-key');
  const statusBanner = document.getElementById('status-message');
  keyInput.value = '';
  keyInput.readOnly = false;
  statusBanner.textContent = '';
  statusBanner.className = 'status hidden';
}

describe('PGP Key Lookup Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    resetInputs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFromKeysOpenPGP', () => {
    it('returns armored key on 200 OK', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(PGP_KEY));
      const key = await fetchFromKeysOpenPGP('sender@example.com');
      expect(key).toBe(PGP_KEY);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://keys.openpgp.org/vks/v1/by-email/sender%40example.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('returns empty string on 200 with empty body', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(''));
      const key = await fetchFromKeysOpenPGP('nokey@example.com');
      expect(key).toBe('');
    });

    it('returns empty string on non-200 response', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse('', false, 404));
      const key = await fetchFromKeysOpenPGP('nokey@example.com');
      expect(key).toBe('');
    });

    it('returns empty string on network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const key = await fetchFromKeysOpenPGP('error@example.com');
      expect(key).toBe('');
    });

    it('times out after 5 seconds', async () => {
      global.fetch.mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Aborted')), 100)));
      const key = await fetchFromKeysOpenPGP('timeout@example.com');
      expect(key).toBe('');
    });
  });

  describe('fetchFromProtonMail', () => {
    it('returns armored key on 200 OK', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(PGP_KEY));
      const key = await fetchFromProtonMail('user@protonmail.com');
      expect(key).toBe(PGP_KEY);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.protonmail.ch/pks/lookup?op=get&search=user%40protonmail.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('returns empty string on 200 with empty body', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(''));
      const key = await fetchFromProtonMail('nokey@example.com');
      expect(key).toBe('');
    });

    it('returns empty string on network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const key = await fetchFromProtonMail('error@example.com');
      expect(key).toBe('');
    });
  });

  describe('lookupPGPKey', () => {
    let senderKeyInput, statusBanner, lastCheckedEmailRef;

    beforeEach(() => {
      const elements = getElements();
      senderKeyInput = elements.senderKeyInput;
      statusBanner = elements.statusBanner;
      lastCheckedEmailRef = elements.lastCheckedEmailRef;
      senderKeyInput.value = '';
      senderKeyInput.readOnly = false;
    });

    it('fetches key from keys.openpgp.org on valid email', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse(PGP_KEY));
      
      await lookupPGPKey('sender@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://keys.openpgp.org/vks/v1/by-email/sender%40example.com',
        expect.any(Object)
      );
      expect(senderKeyInput.value).toBe(PGP_KEY);
      expect(statusBanner.textContent).toBe('Key found and attached');
      expect(statusBanner.className).toContain('success');
    });

    it('falls back to ProtonMail when keys.openpgp.org returns empty', async () => {
      global.fetch
        .mockResolvedValueOnce(createMockResponse(''))
        .mockResolvedValueOnce(createMockResponse(PGP_KEY));
      
      await lookupPGPKey('user@custom-domain.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://keys.openpgp.org/vks/v1/by-email/user%40custom-domain.com',
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://api.protonmail.ch/pks/lookup?op=get&search=user%40custom-domain.com',
        expect.any(Object)
      );
      expect(senderKeyInput.value).toBe(PGP_KEY);
      expect(statusBanner.textContent).toBe('Key found and attached');
    });

    it('clears status when both sources return empty', async () => {
      global.fetch
        .mockResolvedValueOnce(createMockResponse(''))
        .mockResolvedValueOnce(createMockResponse(''));
      
      await lookupPGPKey('nokey@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(senderKeyInput.value).toBe('');
      expect(statusBanner.textContent).toBe('');
      expect(statusBanner.className).toBe('status hidden');
    });

    it('falls back to ProtonMail on network error from keys.openpgp.org', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse(PGP_KEY));
      
      await lookupPGPKey('error@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(senderKeyInput.value).toBe(PGP_KEY);
      expect(statusBanner.textContent).toBe('Key found and attached');
    });

    it('clears status when both sources fail with network errors', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));
      
      await lookupPGPKey('fail@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(statusBanner.textContent).toBe('');
    });

    it('does not fetch for invalid email format', async () => {
      await lookupPGPKey('not-an-email', senderKeyInput, statusBanner, lastCheckedEmailRef);
      await lookupPGPKey('', senderKeyInput, statusBanner, lastCheckedEmailRef);
      await lookupPGPKey('missing@domain', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('caches last checked email and skips duplicate lookup', async () => {
      global.fetch.mockResolvedValue(createMockResponse(PGP_KEY));
      
      await lookupPGPKey('cached@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      await lookupPGPKey('cached@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('skips lookup if key already manually entered', async () => {
      senderKeyInput.value = PGP_KEY;
      
      await lookupPGPKey('manual@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('times out on first source and tries fallback', async () => {
      global.fetch
        .mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Aborted')), 100)))
        .mockResolvedValueOnce(createMockResponse(PGP_KEY));
      
      await lookupPGPKey('timeout@example.com', senderKeyInput, statusBanner, lastCheckedEmailRef);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(senderKeyInput.value).toBe(PGP_KEY);
    });
  });

  describe('lockKeyField', () => {
    let senderKeyInput;

    beforeEach(() => {
      senderKeyInput = getElements().senderKeyInput;
      senderKeyInput.value = '';
      senderKeyInput.readOnly = false;
    });

    it('locks field when value starts with PGP header', () => {
      senderKeyInput.value = PGP_KEY;
      lockKeyField(senderKeyInput);
      expect(senderKeyInput.readOnly).toBe(true);
      expect(senderKeyInput.classList.add).toHaveBeenCalledWith('key-locked');
    });

    it('does not lock field for non-PGP content', () => {
      senderKeyInput.value = 'not a key';
      lockKeyField(senderKeyInput);
      expect(senderKeyInput.readOnly).toBe(false);
      expect(senderKeyInput.classList.add).not.toHaveBeenCalled();
    });
  });

  describe('unlockKeyField', () => {
    let senderKeyInput;

    beforeEach(() => {
      senderKeyInput = getElements().senderKeyInput;
      senderKeyInput.value = '';
      senderKeyInput.readOnly = false;
    });

    it('unlocks field and removes class', () => {
      senderKeyInput.value = PGP_KEY;
      senderKeyInput.readOnly = true;
      senderKeyInput.classList.add('key-locked');
      senderKeyInput.classList.add = vi.fn();
      senderKeyInput.classList.remove = vi.fn();
      
      unlockKeyField(senderKeyInput);
      
      expect(senderKeyInput.readOnly).toBe(false);
      expect(senderKeyInput.classList.remove).toHaveBeenCalledWith('key-locked');
    });
  });

  describe('showStatus', () => {
    let statusBanner;

    beforeEach(() => {
      statusBanner = getElements().statusBanner;
      statusBanner.textContent = '';
      statusBanner.className = 'status hidden';
    });

    it('sets text and class', () => {
      showStatus(statusBanner, 'Test message', 'success');
      expect(statusBanner.textContent).toBe('Test message');
      expect(statusBanner.className).toBe('status success');
    });
  });

  describe('clearStatus', () => {
    let statusBanner;

    beforeEach(() => {
      statusBanner = getElements().statusBanner;
      statusBanner.textContent = '';
      statusBanner.className = 'status hidden';
    });

    it('clears text and sets hidden class', () => {
      statusBanner.textContent = 'Some message';
      statusBanner.className = 'status error';
      clearStatus(statusBanner);
      expect(statusBanner.textContent).toBe('');
      expect(statusBanner.className).toBe('status hidden');
    });
  });

  describe('EMAIL_REGEX', () => {
    it('validates correct emails', () => {
      expect(EMAIL_REGEX.test('test@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('user.name@domain.org')).toBe(true);
      expect(EMAIL_REGEX.test('user+tag@example.co.uk')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(EMAIL_REGEX.test('not-an-email')).toBe(false);
      expect(EMAIL_REGEX.test('')).toBe(false);
      expect(EMAIL_REGEX.test('missing@domain')).toBe(false);
      expect(EMAIL_REGEX.test('@nodomain.com')).toBe(false);
      expect(EMAIL_REGEX.test('nodomain@')).toBe(false);
    });
  });
});

// This file is part of joel.benway.me.
//
 // joel.benway.me is free software: you can redistribute it and/or modify it
 // under the terms of the GNU General Public License as published by the Free
 // Software Foundation, either version 3 of the License, or (at your option) any
 // later version.
 //
 // joel.benway.me is distributed in the hope that it will be useful, but WITHOUT
 // ANY WARRANTY; without even the implied warranty of MERCHANTABILITY OR FITNESS
 // FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 // details.
 //
 // You should have received a copy of the GNU General Public License along with
 // joel.benway.me. If not, see <https://www.gnu.org/licenses/>.