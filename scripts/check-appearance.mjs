// sed 's/TASK_SPACE_ID/114/g' scripts/check-appearance.mjs | ego-browser nodejs
const { strict: assert } = await import("node:assert");
const p = (await taskSpace(Number("TASK_SPACE_ID"))).page("p1");
await p.cdp("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await p.cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
await p.goto("http://localhost:5203/profile");
if (
  await p.evaluate(
    () => !!document.querySelector('[aria-label="使用教會帳號登入"]'),
  )
) {
  await p.click('loc=role:button[name="使用教會帳號登入"]');
  await p.goto("http://localhost:5203/profile");
}
await p.waitForFunction(
  () => !!document.querySelector('[data-testid="appearance-toggle"]'),
);
if (await p.evaluate(() => document.documentElement.dataset.theme === "dark")) {
  await p.evaluate(() =>
    document.querySelector('[data-testid="appearance-toggle"]').click(),
  );
}
await p.waitForFunction(
  () => document.documentElement.dataset.theme === "light",
);
assert.equal(
  await p.evaluate(
    () =>
      [...document.querySelectorAll("*")].find(
        (e) => e.textContent === "服事提醒" && !e.children.length,
      ) &&
      getComputedStyle(
        [...document.querySelectorAll("*")].find(
          (e) => e.textContent === "服事提醒" && !e.children.length,
        ),
      ).color,
  ),
  "rgb(0, 0, 0)",
);
await p.reload();
await p.waitForFunction(
  () => !!document.querySelector('[data-testid="appearance-toggle"]'),
);
assert.equal(
  await p.evaluate(() => localStorage.getItem("hhc-appearance")),
  "light",
);
// Several taps in one event turn must keep the final selection and storage aligned.
await p.evaluate(() => {
  for (let i = 0; i < 5; i++)
    document.querySelector('[data-testid="appearance-toggle"]').click();
});
await p.waitForFunction(
  () => document.documentElement.dataset.theme === "dark",
);
assert.equal(
  await p.evaluate(() => localStorage.getItem("hhc-appearance")),
  "dark",
);
await p.cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }],
});
await p.reload();
await p.waitForFunction(
  () => !!document.querySelector('[data-testid="appearance-toggle"]'),
);
assert.equal(
  await p.evaluate(() => document.documentElement.style.colorScheme),
  "dark",
);
// A blocked storage write must not make the control unresponsive.
await p.evaluate(() => {
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = () => {
    throw new DOMException("Blocked", "SecurityError");
  };
  try {
    document.querySelector('[data-testid="appearance-toggle"]').click();
  } finally {
    Storage.prototype.setItem = set;
  }
});
await p.waitForFunction(
  () => !!document.querySelector('[data-testid="appearance-toggle"]'),
);
assert.equal(
  await p.evaluate(() => document.documentElement.dataset.theme),
  "light",
);
await p.evaluate(() =>
  document.querySelector('[data-testid="appearance-toggle"]').click(),
);
await p.evaluate(() =>
  document.querySelector('[data-testid="appearance-toggle"]').click(),
);
await p.click("loc=href:/");
await p.waitForSelector('loc=role:button[name*="下一次服事"]');
console.log(
  "PASS: OS override, native-control web label contrast, reload persistence, rapid taps, unavailable storage, navigation",
);
