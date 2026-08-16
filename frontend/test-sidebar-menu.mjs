import assert from 'node:assert/strict';
import { findOpenGroupForPath } from './src/layouts/sidebarMenuUtils.js';

const config = [
  { key: 'dashboard', to: '/dashboard' },
  { key: 'input', children: [{ to: '/sales/stock-in' }, { to: '/sales/stock-issues' }] },
  { key: 'operasional', children: [{ to: '/visits' }, { to: '/sales/transactions' }] },
  { key: 'settings', to: '/settings' },
];

assert.equal(findOpenGroupForPath('/dashboard', config), null, 'top-level route -> null');
assert.equal(findOpenGroupForPath('/settings', config), null, 'top-level route -> null');
assert.equal(findOpenGroupForPath('/sales/stock-in', config), 'input', 'route -> group input');
assert.equal(findOpenGroupForPath('/sales/transactions/new', config), 'operasional', 'nested route -> parent group');
assert.equal(findOpenGroupForPath('/unknown', config), null, 'unknown route -> null');

console.log('sidebar menu utils: all tests passed');
