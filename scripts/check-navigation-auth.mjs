// sed 's/TASK_SPACE_ID/111/g' scripts/check-navigation-auth.mjs | ego-browser nodejs
const { strict: assert } = await import("node:assert");
const p = (await taskSpace(Number("TASK_SPACE_ID"))).page("p1");
const origin = "http://localhost:5202";
const login = 'loc=role:button[name="使用教會帳號登入"]';
const logout = 'loc=role:button[name="登出"]';
const toggle = '[data-testid="appearance-toggle"]';
const assignment = "/assignment/44444444-4444-4444-8444-444444444444";
await p.goto(origin + "/profile");
if (
  await p.evaluate(
    () => !!document.querySelector('[aria-label="使用教會帳號登入"]'),
  )
) {
  await p.click(login);
  await p.goto(origin + "/profile");
}
await p.waitForSelector(logout);
await p.click(logout);
await p.waitForSelector(login);
assert.equal(
  await p.evaluate(() => document.querySelectorAll('[role="tab"]').length),
  0,
);
for (const route of [
  "/",
  "/service",
  "/profile",
  "/notifications",
  assignment,
]) {
  await p.goto(origin + route);
  await p.waitForSelector(login);
  assert.equal(
    await p.evaluate(() => document.querySelectorAll('[role="tab"]').length),
    0,
  );
}
await p.click(login);
await p.waitForSelector('loc=role:button[name="找代班"]');
assert.equal(await p.evaluate(() => location.pathname), assignment);
await p.click('loc=role:link[name="返回, back"]');
await p.waitForSelector('loc=role:button[name*="下一次服事"]');
assert.deepEqual(
  await p.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((e) =>
      e.textContent.replace(/[^\u4e00-\u9fff]/g, ""),
    ),
  ),
  ["首頁", "服事", "我的"],
);
await p.click('loc=role:button[name="通知，1 則未讀"]');
await p.click('loc=role:button[name="未讀，代班邀請，詩歌伴唱"]');
await p.waitForSelector('loc=role:button[name="接受代班"]');
await p.click('loc=role:link[name="返回, back"]');
await p.click('loc=role:link[name="返回, back"]');
await p.waitForSelector('loc=role:button[name="通知"]');
await p.click('a[href="/profile"]');
await p.waitForFunction(
  () => !!document.querySelector('[data-testid="appearance-toggle"]'),
);
const before = await p.evaluate(() => document.documentElement.dataset.theme);
// Expo's web switch input is visually hidden inside its label; dispatch its native click.
await p.evaluate(() =>
  document.querySelector('[data-testid="appearance-toggle"]').click(),
);
const after = before === "light" ? "dark" : "light";
await p.waitForFunction(
  (mode) => document.documentElement.dataset.theme === mode,
  after,
);
await p.reload();
await p.waitForFunction(
  () => !!document.querySelector('[data-testid="appearance-toggle"]'),
);
assert.equal(await p.evaluate(() => location.pathname), "/profile");
assert.equal(
  await p.evaluate(() => document.documentElement.dataset.theme),
  after,
);
await p.click(logout);
await p.waitForSelector(login);
await p.cdp("Page.navigateToHistoryEntry", {
  entryId: (await p.cdp("Page.getNavigationHistory")).entries.at(-2).id,
});
await p.waitForSelector(login);
assert.equal(
  await p.evaluate(() => document.querySelectorAll('[role="tab"]').length),
  0,
);
await p.reload();
await p.waitForSelector(login);
console.log(
  "PASS: all private routes require login; assignment return and back; 3 tabs; notification read badge; theme persistence; logout blocks back/reload",
);
