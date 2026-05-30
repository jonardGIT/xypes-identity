import assert from "node:assert/strict";
import test from "node:test";

import { renderAccessReviewConsole } from "./render-access-review-console.js";

test("renderAccessReviewConsole includes explicit approval selection and audit visibility affordances", () => {
  const html = renderAccessReviewConsole();

  assert.match(html, /Select a candidate from the workbench before activating privileged access\./);
  assert.match(html, /data-candidate-id=/);
  assert.match(html, /Activate selected binding/);
  assert.match(html, /activation-confirmation/);
  assert.match(html, /Latest audit event id: pending/);
  assert.match(html, /loadWorkbench\(false\)/);
  assert.match(html, /Binding activated\. Latest audit event id:/);
});