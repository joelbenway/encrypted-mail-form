// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import { vi } from "vitest";

global.fetch = vi.fn();

function createMockClassList() {
  const classes = new Set();
  return {
    add: vi.fn((className) => classes.add(className)),
    remove: vi.fn((className) => classes.delete(className)),
    contains: vi.fn((className) => classes.has(className)),
    toggle: vi.fn((className) => {
      if (classes.has(className)) {
        classes.delete(className);
        return false;
      }
      classes.add(className);
      return true;
    }),
    _classes: classes,
  };
}

function setupDOM() {
  const mockClassList = createMockClassList();

  document.body.innerHTML = `
    <form id="contact-form">
      <input id="sender-email" type="email" />
      <textarea id="message"></textarea>
      <textarea id="sender-key"></textarea>
      <div id="status-message" class="status hidden"></div>
      <button id="submit-btn" type="submit"></button>
    </form>
  `;

  // Replace classList on relevant elements
  const keyInput = document.getElementById("sender-key");
  const statusBanner = document.getElementById("status-message");
  const form = document.getElementById("contact-form");

  Object.defineProperty(keyInput, "classList", {
    value: mockClassList,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(statusBanner, "classList", {
    value: mockClassList,
    writable: true,
    configurable: true,
  });

  // Use native form reset behavior
  const originalReset = form.reset.bind(form);
  form.reset = vi.fn(() => {
    originalReset();
    keyInput.value = "";
    statusBanner.textContent = "";
    statusBanner.className = "status hidden";
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
