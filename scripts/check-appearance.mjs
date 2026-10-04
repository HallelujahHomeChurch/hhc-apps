// sed 's/TASK_SPACE_ID/110/g' scripts/check-appearance.mjs | ego-browser nodejs
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
await p.goto("http://localhost:5201/profile");
await p.waitForSelector('loc=role:button[name*="切換"]');
if (
  await p.evaluate(
    () => !!document.querySelector('[aria-label="切換淺色模式"]'),
  )
) {
  await p.click('loc=role:button[name="切換淺色模式"]');
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
await p.waitForSelector('loc=role:button[name="切換深色模式"]');
assert.equal(
  await p.evaluate(() => localStorage.getItem("hhc-appearance")),
  "light",
);
// Several taps in one event turn must keep the final selection and storage aligned.
await p.evaluate(() => {
  for (let i = 0; i < 5; i++)
    document.querySelector('[aria-label^="切換"]').click();
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
await p.waitForSelector('loc=role:button[name="切換淺色模式"]');
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
    document.querySelector('[aria-label="切換淺色模式"]').click();
  } finally {
    Storage.prototype.setItem = set;
  }
});
await p.waitForSelector('loc=role:button[name="切換深色模式"]');
assert.equal(
  await p.evaluate(() => document.documentElement.dataset.theme),
  "light",
);
await p.click('loc=role:button[name="切換深色模式"]');
await p.click('loc=role:button[name="切換淺色模式"]');
await p.click("loc=href:/");
await p.waitForSelector('loc=role:button[name*="下一次服事"]');
console.log(
  "PASS: OS override, native-control web label contrast, reload persistence, rapid taps, unavailable storage, navigation",
);
