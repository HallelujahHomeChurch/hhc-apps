// sed 's/TASK_SPACE_ID/110/g' scripts/check-initialization.mjs | ego-browser nodejs
const { strict: assert } = await import("node:assert");
const p = (await taskSpace(Number("TASK_SPACE_ID"))).page("p1");
const script = await p.cdp("Page.addScriptToEvaluateOnNewDocument", {
  source: `const uuid = crypto.randomUUID.bind(crypto);
    crypto.randomUUID = () => {
      crypto.randomUUID = uuid;
      throw new Error("Simulated device initialization failure");
    };`,
});
try {
  await p.goto("http://localhost:5201/");
  await p.waitForSelector('loc=role:button[name="重試"]');
  assert.ok(
    await p.evaluate(() =>
      document.body.innerText.includes("無法讀取本機登入資料，請再試一次。"),
    ),
  );
  assert.equal(
    await p.evaluate(
      () => document.querySelectorAll('[role="progressbar"]').length,
    ),
    0,
  );
  await p.click('loc=role:button[name="重試"]');
  await p.waitForSelector('loc=role:button[name*="下一次服事"]');
  console.log(
    "PASS: initialization failure stops the spinner and retry recovers the session",
  );
} finally {
  await p.cdp("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: script.identifier,
  });
  await p.reload();
}
