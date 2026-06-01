import assert from "node:assert/strict";
import test from "node:test";

import { renderOnboardingConsole } from "./render-onboarding-console.js";

test("renderOnboardingConsole includes mapping capture and preview or apply affordances", () => {
  const html = renderOnboardingConsole();

  assert.match(html, /Onboarding console/);
  assert.match(html, /supabase-project-ref/);
  assert.match(html, /tenant-resolution-rule/);
  assert.match(html, /tenant-membership-bootstrap/);
  assert.match(html, /confirm-preview-reviewed/);
  assert.match(html, /confirm-manual-steps-reviewed/);
  assert.match(html, /Run a preview to unlock apply/);
  assert.match(html, /Preview onboarding plan/);
  assert.match(html, /Apply onboarding manifest/);
  assert.match(html, /disabled>Apply onboarding manifest/);
  assert.match(html, /buildManifest = \(\) =>/);
  assert.match(html, /escapeHtml = \(value\) =>/);
  assert.match(html, /markPreviewStaleIfNeeded = \(\) =>/);
  assert.match(html, /updateApplyState\(\);/);
  assert.match(html, /submitManifest\(true\)/);
  assert.match(html, /submitManifest\(false\)/);
});
