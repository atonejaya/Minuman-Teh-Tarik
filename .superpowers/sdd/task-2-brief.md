### Task 2: Service + util murni (dengan test node)

**Files:**
- Create: `frontend/src/modules/payroll/utils/payrollUtils.js`
- Create: `frontend/src/modules/payroll/services/PayrollApiService.js`
- Test: `frontend/test-payroll-utils.mjs`

**Interfaces:**
- Consumes: `supabase` dari `frontend/src/utils/supabase`.
- Produces: `toMonthKey(date)` → `'YYYY-MM'`; `sumBy(rows, key)` → number; `PayrollApiService.getSummary(month)` → `Promise<Array>` (rows RPC summary); `PayrollApiService.getDetail(salesId, month)` → `Promise<Array>` (rows RPC detail).

- [ ] **Step 1: Tulis test yang gagal dulu**

Buat `frontend/test-payroll-utils.mjs`:

```js
import assert from 'node:assert/strict';
import { toMonthKey, sumBy } from './src/modules/payroll/utils/payrollUtils.js';

assert.equal(toMonthKey(new Date(2026, 7, 16)), '2026-08', 'bulan Agustus -> 08');
assert.equal(toMonthKey(new Date(2026, 0, 5)), '2026-01', 'bulan Januari -> 01');
assert.equal(toMonthKey(new Date(2026, 11, 31)), '2026-12', 'bulan Desember -> 12');

assert.equal(sumBy([{ a: 500 }, { a: 1500 }], 'a'), 2000, 'jumlahkan kolom');
assert.equal(sumBy([{ a: '500' }, { a: undefined }], 'a'), 500, 'string number + undefined');
assert.equal(sumBy([], 'a'), 0, 'array kosong -> 0');
assert.equal(sumBy(null, 'a'), 0, 'null -> 0');

console.log('payroll utils: all tests passed');
```

- [ ] **Step 2: Jalankan test untuk pastikan gagal**

Run (dari `frontend/`): `node test-payroll-utils.mjs`
Expected: FAIL dengan `Error [ERR_MODULE_NOT_FOUND]` (file util belum ada).

- [ ] **Step 3: Implementasi util murni**

Buat `frontend/src/modules/payroll/utils/payrollUtils.js`:

```js
export const toMonthKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const sumBy = (rows, key) =>
  (rows || []).reduce((s, r) => s + Number(r[key] || 0), 0);
```

- [ ] **Step 4: Jalankan test untuk pastikan lolos**

Run (dari `frontend/`): `node test-payroll-utils.mjs`
Expected: PASS, `payroll utils: all tests passed`.

- [ ] **Step 5: Implementasi service**

Buat `frontend/src/modules/payroll/services/PayrollApiService.js`:

```js
import { supabase } from '../../../utils/supabase';

const PayrollApiService = {
  async getSummary(month) {
    const { data, error } = await supabase.rpc('get_payroll_summary', { p_month: month });
    if (error) throw error;
    return data || [];
  },

  async getDetail(salesId, month) {
    const { data, error } = await supabase.rpc('get_payroll_detail', { p_sales_id: salesId, p_month: month });
    if (error) throw error;
    return data || [];
  },
};

export default PayrollApiService;
```

- [ ] **Step 6: Jalankan lint + test**

Run (dari `frontend/`): `npm run lint; if ($?) { node test-payroll-utils.mjs }`
Expected: lint 0 error baru; test PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/test-payroll-utils.mjs frontend/src/modules/payroll/utils/payrollUtils.js frontend/src/modules/payroll/services/PayrollApiService.js
git commit -m "feat(payroll): util toMonthKey/sumBy + PayrollApiService (RPC wrapper)"
```

---

