import assert from "node:assert/strict";
import test from "node:test";

import { renderOnboardingConsole } from "./render-onboarding-console.js";

test("renderOnboardingConsole includes mapping capture and preview or apply affordances", () => {
  const html = renderOnboardingConsole();

  assert.match(html, /Onboarding console/);
  assert.match(html, /supabase-project-ref/);
  assert.match(html, /tenant-resolution-rule/);
  assert.match(html, /tenant-membership-bootstrap/);
  assert.match(html, /Preview onboarding plan/);
  assert.match(html, /Apply onboarding manifest/);
  assert.match(html, /buildManifest = \(\) =>/);
  assert.match(html, /submitManifest\(true\)/);
  assert.match(html, /submitManifest\(false\)/);
});