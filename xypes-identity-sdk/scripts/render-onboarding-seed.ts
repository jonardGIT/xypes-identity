import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

interface ParsedArgs {
  tenantId: string;
  applicationId: string;
  slug: string;
  displayName: string;
  supabaseProjectRef?: string;
  supabaseJwtIssuer?: string;
  supabaseJwtAudience?: string;
  tenantResolutionRule?: "route_segment" | "trusted_subdomain" | "dedicated_internal_header";
  tenantResolutionDetail?: string;
  tenantMembershipBootstrap?: string;
  output?: string;
}

interface OnboardingSeedManifest {
  tenant_id: string;
  identity_bridge_mapping: {
    supabase_project_ref: string;
    expected_jwt_issuer: string;
    expected_jwt_audience: string;
    tenant_resolution_rule: "route_segment" | "trusted_subdomain" | "dedicated_internal_header";
    tenant_resolution_detail: string;
    tenant_membership_bootstrap: string;
  };
  application: {
    application_id: string;
    slug: string;
    display_name: string;
  };
  permissions: Array<{
    ref: string;
    action: string;
    resource_type: string;
    description: string;
  }>;
  role_definitions: Array<{
    name: string;
    description: string;
    approval_required: boolean;
    status: "active";
    permission_refs: string[];
  }>;
  validation_checklist: string[];
}

const parseArgs = (argv: string[]): ParsedArgs => {
  const parsed: Partial<ParsedArgs> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const nextValue = argv[index + 1];

    if (value === "--tenant-id") {
      parsed.tenantId = nextValue;
      index += 1;
    } else if (value === "--application-id") {
      parsed.applicationId = nextValue;
      index += 1;
    } else if (value === "--slug") {
      parsed.slug = nextValue;
      index += 1;
    } else if (value === "--display-name") {
      parsed.displayName = nextValue;
      index += 1;
    } else if (value === "--supabase-project-ref") {
      parsed.supabaseProjectRef = nextValue;
      index += 1;
    } else if (value === "--supabase-jwt-issuer") {
      parsed.supabaseJwtIssuer = nextValue;
      index += 1;
    } else if (value === "--supabase-jwt-audience") {
      parsed.supabaseJwtAudience = nextValue;
      index += 1;
    } else if (value === "--tenant-resolution-rule") {
      parsed.tenantResolutionRule = nextValue as ParsedArgs["tenantResolutionRule"];
      index += 1;
    } else if (value === "--tenant-resolution-detail") {
      parsed.tenantResolutionDetail = nextValue;
      index += 1;
    } else if (value === "--tenant-membership-bootstrap") {
      parsed.tenantMembershipBootstrap = nextValue;
      index += 1;
    } else if (value === "--output") {
      parsed.output = nextValue;
      index += 1;
    }
  }

  if (
    parsed.tenantId === undefined
    || parsed.applicationId === undefined
    || parsed.slug === undefined
    || parsed.displayName === undefined
  ) {
    throw new Error(
      "Usage: npm run onboarding:seed -- --tenant-id <tenant> --application-id <app> --slug <slug> --display-name <name> [--output <file>]",
    );
  }

  return parsed as ParsedArgs;
};

const buildManifest = (args: ParsedArgs): OnboardingSeedManifest => ({
  tenant_id: args.tenantId,
  identity_bridge_mapping: {
    supabase_project_ref: args.supabaseProjectRef ?? `${args.slug}-supabase-project`,
    expected_jwt_issuer:
      args.supabaseJwtIssuer ?? `https://${args.slug}.supabase.co/auth/v1`,
    expected_jwt_audience: args.supabaseJwtAudience ?? "authenticated",
    tenant_resolution_rule: args.tenantResolutionRule ?? "route_segment",
    tenant_resolution_detail:
      args.tenantResolutionDetail ?? `Resolve tenant_id from /tenants/${args.tenantId}/... request routes.`,
    tenant_membership_bootstrap:
      args.tenantMembershipBootstrap ?? "Grant tenant membership manually before enabling enforcement.",
  },
  application: {
    application_id: args.applicationId,
    slug: args.slug,
    display_name: args.displayName,
  },
  permissions: [
    {
      ref: "read",
      action: "read",
      resource_type: `${args.slug}.record`,
      description: `Read ${args.displayName} records`,
    },
    {
      ref: "write",
      action: "write",
      resource_type: `${args.slug}.record`,
      description: `Write ${args.displayName} records`,
    },
    {
      ref: "approve",
      action: "approve",
      resource_type: `${args.slug}.record`,
      description: `Approve privileged ${args.displayName} actions`,
    },
  ],
  role_definitions: [
    {
      name: `${args.slug}-operator`,
      description: `Operational access for ${args.displayName}`,
      approval_required: false,
      status: "active",
      permission_refs: ["read", "write"],
    },
    {
      name: `${args.slug}-approver`,
      description: `Privileged approval access for ${args.displayName}`,
      approval_required: true,
      status: "active",
      permission_refs: ["read", "approve"],
    },
  ],
  validation_checklist: [
    "Confirm the tenant_id matches the explicit tenant routing used by the consuming app.",
    "Review permission names and resource types before seeding control-plane state.",
    "Keep approval_required enabled for privileged actions until the governance flow is exercised.",
    "Run resolve-session plus authorize.check in a non-production environment before tenant enforcement.",
  ],
});

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const manifest = buildManifest(args);
  const rendered = `${JSON.stringify(manifest, null, 2)}\n`;

  if (args.output === undefined) {
    process.stdout.write(rendered);
    return;
  }

  const outputPath = path.resolve(process.cwd(), args.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered, "utf8");
};

await main();