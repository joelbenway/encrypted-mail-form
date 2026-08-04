import { vi } from 'vitest';

global.fetch = vi.fn();

Object.defineProperty(window, 'location', { value: { href: 'http://localhost' } });

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
    _classes: classes
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
  const keyInput = document.getElementById('sender-key');
  const statusBanner = document.getElementById('status-message');
  
  Object.defineProperty(keyInput, 'classList', {
    value: mockClassList,
    writable: true,
    configurable: true
  });
  
  Object.defineProperty(statusBanner, 'classList', {
    value: mockClassList,
    writable: true,
    configurable: true
  });
  
  // Mock form reset
  const form = document.getElementById('contact-form');
  form.reset = vi.fn(() => {
    keyInput.value = '';
    statusBanner.textContent = '';
    statusBanner.className = 'status hidden';
  });
}

setupDOM();