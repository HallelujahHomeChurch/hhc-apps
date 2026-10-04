// Run against a synthetic preview in an existing Ego task space:
// sed 's/TASK_SPACE_ID/109/g' scripts/check-pull-refresh.mjs | ego-browser nodejs
const { strict: assert } = await import("node:assert");
const space = await taskSpace(Number("TASK_SPACE_ID"));
const p = space.page("p1");
await p.cdp("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await p.cdp("Emulation.setTouchEmulationEnabled", {
  enabled: true,
  maxTouchPoints: 1,
});
await p.goto("http://localhost:5201");
await p.waitForSelector('loc=role:button[name*="下一次服事"]', {
  state: "visible",
});
// Intercept only synthetic Response parsing, without making external requests.
await p.evaluate(() => {
  window.refreshQA = { reads: 0, block: false, fail: false };
  const original = Response.prototype.json;
  window.restoreRefreshQA = () => {
    Response.prototype.json = original;
  };
  Response.prototype.json = async function () {
    const data = await original.call(this);
    if (Array.isArray(data) && data[0]?.memberId && "canManage" in data[0]) {
      const qa = window.refreshQA;
      qa.reads++;
      if (qa.fail) {
        qa.fail = false;
        throw new Error("更新失敗，請再試一次。");
      }
      if (qa.block)
        await new Promise((resolve) => {
          qa.release = resolve;
        });
    }
    return data;
  };
});
const reads = () => p.evaluate(() => window.refreshQA.reads);
const idle = () =>
  p.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid="pull-indicator"]')].every(
      (e) => e.getBoundingClientRect().height === 0,
    ),
  );
async function drag(dy, { cancel = false, dx = 0 } = {}) {
  await p.cdp("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 180, y: 160 }],
  });
  for (let step = 1; step <= 5; step++)
    await p.cdp("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 180 + (dx * step) / 5, y: 160 + (dy * step) / 5 }],
    });
  await p.cdp("Input.dispatchTouchEvent", {
    type: cancel ? "touchCancel" : "touchEnd",
    touchPoints: [],
  });
}
try {
  await drag(40);
  await idle();
  assert.equal(await reads(), 0, "Short pulls must not refresh");
  await drag(180, { cancel: true });
  await idle();
  assert.equal(await reads(), 0, "Cancelled pulls must not refresh");
  await drag(20, { dx: 90 });
  await idle();
  assert.equal(await reads(), 0, "Horizontal swipes must not refresh");
  await p.evaluate(() => {
    window.refreshQA.block = true;
  });
  await drag(180);
  await p.waitForFunction(() => window.refreshQA.reads === 1);
  await p.waitForSelector('loc=role:status[name="正在更新"]', {
    state: "visible",
  });
  await drag(180);
  assert.equal(await reads(), 1, "In-flight refresh must not duplicate");
  await p.evaluate(() => {
    window.refreshQA.block = false;
    window.refreshQA.release();
  });
  await idle();
  assert.equal(
    await p.evaluate(() => location.pathname),
    "/",
    "Dragging a card must not open it",
  );
  assert.ok(
    await p.evaluate(() => {
      const scroll = document.querySelector('[data-testid="pull-indicator"]')
        .parentElement.lastElementChild;
      scroll.scrollTop = 30;
      return scroll.scrollTop > 0;
    }),
    "Scroll-away precondition",
  );
  await drag(180);
  await idle();
  assert.equal(
    await reads(),
    1,
    "Only a gesture starting at the top refreshes",
  );
  await p.evaluate(() => {
    document.querySelector(
      '[data-testid="pull-indicator"]',
    ).parentElement.lastElementChild.scrollTop = 0;
    window.refreshQA.fail = true;
  });
  await drag(180);
  await idle();
  await p.waitForSelector('loc=role:button[name="重新整理"]', {
    state: "visible",
  });
  // The retry disappears immediately on activation; invoke the observed button
  // directly so the driver's post-click locator retry doesn't click it twice.
  await p.evaluate(() =>
    [...document.querySelectorAll('[role="button"]')]
      .find((e) => e.textContent === "重新整理")
      .click(),
  );
  await p.waitForSelector('loc=role:button[name="重新整理"]', {
    state: "hidden",
  });
  assert.equal(await reads(), 3, "Error retry must restore content");
  await p.click("loc=href:/profile");
  await p.selectOption('loc=role:combobox[name="提醒日期"]', "2");
  const beforeSettingsPull = await reads();
  // Start over the top margin, not an editable field.
  await p.cdp("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 12, y: 120 }],
  });
  for (const y of [150, 190, 230, 270])
    await p.cdp("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 12, y }],
    });
  await p.cdp("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await idle();
  assert.equal(
    await reads(),
    beforeSettingsPull + 1,
    "Settings can pull to refresh",
  );
  assert.equal(
    await p.evaluate(
      () => document.querySelector('select[aria-label="提醒日期"]').value,
    ),
    "2",
    "Refresh preserves an unsaved draft",
  );
  const beforeExpiry = await reads();
  await p.evaluate(() => {
    const original = performance.now.bind(performance);
    window.restoreClockQA = () => {
      performance.now = original;
    };
    performance.now = () => original() + 301000;
  });
  await p.waitForFunction(
    (before) => window.refreshQA.reads > before,
    beforeExpiry,
  );
  await p.waitForSelector('loc=role:button[name="儲存提醒"]', {
    state: "visible",
  });
  assert.equal(
    await p.evaluate(
      () => document.querySelector('select[aria-label="提醒日期"]').value,
    ),
    "2",
    "Automatic expiry refresh preserves the draft",
  );
  assert.equal(
    await p.evaluate(() => document.body.innerText.includes("快取已過期")),
    false,
  );
  console.log(
    "PASS: short/cancel/horizontal pulls, threshold, duplicate guard, scroll position, card interaction, error/retry, draft preservation, automatic expiry refresh",
  );
} finally {
  await p.evaluate(() => {
    window.restoreClockQA?.();
    window.refreshQA.release?.();
    window.restoreRefreshQA();
  });
}
