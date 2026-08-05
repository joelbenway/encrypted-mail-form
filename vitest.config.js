// Copyright (c) 2026  Joel Benway
// SPDX-License-Identifier: GPL-3.0-or-later
// Please see end of file for extended copyright information

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.js'],
    projects: [
      {
        name: 'client',
        test: {
          environment: 'jsdom',
          environmentOptions: {
            jsdom: {
              url: 'http://localhost',
            },
          },
          include: ['test/app.test.js'],
          setupFiles: ['test/setup.js'],
        },
      },
      {
        name: 'worker',
        test: {
          environment: 'node',
          include: ['test/worker.test.js'],
        },
      },
    ],
  },
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
