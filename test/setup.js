// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import { vi } from 'vitest';

global.fetch = vi.fn();

function setupDOM() {
  document.body.innerHTML = `
    <form id="contact-form">
      <input id="sender-email" type="email" />
      <textarea id="message"></textarea>
      <textarea id="sender-key"></textarea>
      <div id="status-message" class="status hidden"></div>
      <button id="submit-btn" type="submit"></button>
    </form>
  `;

  // Use native form reset behavior
  const form = document.getElementById('contact-form');
  const keyInput = document.getElementById('sender-key');
  const statusBanner = document.getElementById('status-message');
  const originalReset = form.reset.bind(form);
  form.reset = vi.fn(() => {
    originalReset();
    keyInput.value = '';
    statusBanner.textContent = '';
    statusBanner.className = 'status hidden';
  });
}

setupDOM();

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
