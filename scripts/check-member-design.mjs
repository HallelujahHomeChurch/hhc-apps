// sed 's/TASK_SPACE_ID/114/g' scripts/check-member-design.mjs | ego-browser nodejs
const { strict: assert } = await import("node:assert");
const p = (await taskSpace(Number("TASK_SPACE_ID"))).page("p1");
await p.goto("http://localhost:5203");
await p.waitForFunction(
  () =>
    !!document.querySelector(
      'a[href="/service"], [aria-label="使用教會帳號登入"]',
    ),
);
if (
  await p.evaluate(
    () => !!document.querySelector('[aria-label="使用教會帳號登入"]'),
  )
) {
  await p.click('loc=role:button[name="使用教會帳號登入"]');
}
await p.waitForSelector('loc=role:button[name*="下一次服事"]');
assert.equal(
  await p.evaluate(() => document.body.textContent.includes("接下來")),
  false,
);
await p.click('a[href="/service"]');
await p.waitForFunction(
  () => !document.querySelector('select[aria-label="選擇月份"]').disabled,
);
const current = await p.evaluate(
  () => document.querySelector('select[aria-label="選擇月份"]').value,
);
await p.click('loc=role:button[name="下個月"]');
await p.waitForFunction(
  () => !document.querySelector('select[aria-label="選擇月份"]').disabled,
);
const next = await p.evaluate(
  () => document.querySelector('select[aria-label="選擇月份"]').value,
);
assert.notEqual(next, current);
await p.click('a[href="/"]');
await p.waitForSelector('loc=role:button[name*="下一次服事"]');
await p.click('a[href="/service"]');
assert.equal(
  await p.evaluate(
    () => document.querySelector('select[aria-label="選擇月份"]').value,
  ),
  next,
);
// Fault injection stays inside the local synthetic transport.
await p.evaluate(() => {
  window.memberQA = { profileFail: true, empty: false };
  const original = Response.prototype.json;
  window.restoreMemberQA = () => {
    Response.prototype.json = original;
  };
  Response.prototype.json = async function () {
    const data = await original.call(this);
    if (data?.email && window.memberQA.profileFail)
      throw new Error("profile unavailable");
    if (
      Array.isArray(data) &&
      data[0]?.memberId &&
      "canManage" in data[0] &&
      window.memberQA.empty
    )
      return [];
    if (data?.items?.[0]?.startsAt) {
      data.items.push({
        ...data.items[0],
        id: "77777777-7777-4777-8777-777777777777",
        label: "同日第二項服事",
      });
    }
    return data;
  };
});
try {
  await p.click('loc=role:button[name="上個月"]');
  await p.waitForSelector('loc=role:button[name*="同日第二項服事"]');
  const dates = await p.evaluate(() =>
    [...document.querySelectorAll('[role="heading"]')]
      .map((e) => e.textContent)
      .filter((v) => /週/.test(v)),
  );
  assert.equal(
    dates.length,
    new Set(dates).size,
    "Same-day rows share one date heading",
  );
  await p.click('a[href="/profile"]');
  await p.waitForSelector('loc=role:button[name="重新讀取會員資料"]');
  assert.equal(
    await p.evaluate(() => document.body.textContent.includes("敬拜團契")),
    true,
  );
  await p.evaluate(() => {
    window.memberQA.profileFail = false;
  });
  await p.click('loc=role:button[name="重新讀取會員資料"]');
  await p.waitForFunction(
    () =>
      document.body.textContent.includes("yien@example.com") &&
      !document.querySelector('[aria-label="重新讀取會員資料"]'),
  );
  await p.evaluate(() => {
    window.memberQA.empty = true;
  });
  await p.click('a[href="/service"]');
  await p.click('loc=role:button[name="下個月"]');
  await p.waitForFunction(() =>
    document.body.textContent.includes("尚未加入服事團契"),
  );
  await p.click('a[href="/profile"]');
  await p.waitForFunction(() =>
    document.body.textContent.includes("尚未加入服事團契"),
  );
} finally {
  await p.evaluate(() => window.restoreMemberQA());
  await p.goto("http://localhost:5203");
}
await p.waitForSelector('loc=role:button[name*="下一次服事"]');
console.log(
  "PASS: minimal home; month selection survives tabs; same-day grouping; profile failure isolated and retryable; no-fellowship empty states",
);
