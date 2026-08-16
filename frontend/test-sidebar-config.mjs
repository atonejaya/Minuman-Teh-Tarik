import assert from 'node:assert/strict';
import { MENU_CONFIG } from './src/layouts/sidebarConfig.js';

const keys = new Set();
const routes = new Set();

for (const item of MENU_CONFIG) {
  assert.ok(item.key, 'item must have key');
  assert.ok(!keys.has(item.key), `duplicate key: ${item.key}`);
  keys.add(item.key);

  if (item.children) {
    assert.ok(item.label, `group ${item.key} must have label`);
    for (const child of item.children) {
      assert.ok(child.to, `${item.key}: child must have "to"`);
      assert.ok(child.label, `${item.key}: child ${child.to} must have label`);
      assert.ok(child.icon, `${item.key}: child ${child.to} must have icon`);
      assert.ok(!routes.has(child.to), `duplicate route: ${child.to}`);
      routes.add(child.to);
    }
  } else {
    assert.ok(item.to, `${item.key}: top-level item must have "to"`);
    assert.ok(item.icon, `${item.key}: top-level item must have icon`);
  }
}

assert.ok(routes.has('/payroll'), 'config must link /payroll');
assert.ok(routes.has('/operational-cost'), 'config must link /operational-cost');

console.log(`sidebar config: ${MENU_CONFIG.length} top-level items OK`);
