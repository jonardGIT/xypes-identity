import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const sdkRoot = path.resolve(import.meta.dirname, "..");
const tsxCli = path.join(sdkRoot, "node_modules", ".bin", "tsx");
const scriptPath = path.join(sdkRoot, "scripts", "render-onboarding-seed.ts");

const runSeedScript = (...args: string[]) =>
  spawnSync(tsxCli, [scriptPath, ...args], {
    cwd: sdkRoot,
    encoding: "utf8",
  });

test("render-onboarding-seed emits the requested tenant membership bootstrap guidance", () => {
  const result = runSeedScript(
    "--tenant-id",
    "tenant_123",
    "--application-id",
    "application_billing_123",
    "--slug",
    "billing",
    "--display-name",
    "Billing",
    "--tenant-membership-bootstrap",
    "Sync tenant membership from the billing admin roster before go-live.",
  );

  assert.equal(result.status, 0, result.stderr);

  const manifest = JSON.parse(result.stdout) as {
    identity_bridge_mapping: { tenant_membership_bootstrap: string };
  };

  assert.equal(
    manifest.identity_bridge_mapping.tenant_membership_bootstrap,
    "Sync tenant membership from the billing admin roster before go-live.",
  );
});

test("render-onboarding-seed rejects unsupported tenant resolution rules", () => {
  const result = runSeedScript(
    "--tenant-id",
    "tenant_123",
    "--application-id",
    "application_billing_123",
    "--slug",
    "billing",
    "--display-name",
    "Billing",
    "--tenant-resolution-rule",
    "invalid-rule",
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /--tenant-resolution-rule must be one of route_segment, trusted_subdomain, dedicated_internal_header/,
  );
});
