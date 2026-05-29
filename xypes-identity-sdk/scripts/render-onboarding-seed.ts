import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

interface ParsedArgs {
  tenantId: string;
  applicationId: string;
  slug: string;
  displayName: string;
  output?: string;
}

interface OnboardingSeedManifest {
  tenant_id: string;
  application: {
    application_id: string;
    slug: string;
    display_name: string;
  };
  permissions: Array<{
    action: string;
    resource_type: string;
    description: string;
  }>;
  role_definitions: Array<{
    name: string;
    description: string;
    approval_required: boolean;
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
  application: {
    application_id: args.applicationId,
    slug: args.slug,
    display_name: args.displayName,
  },
  permissions: [
    {
      action: "read",
      resource_type: `${args.slug}.record`,
      description: `Read ${args.displayName} records`,
    },
    {
      action: "write",
      resource_type: `${args.slug}.record`,
      description: `Write ${args.displayName} records`,
    },
    {
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
      permission_refs: ["read", "write"],
    },
    {
      name: `${args.slug}-approver`,
      description: `Privileged approval access for ${args.displayName}`,
      approval_required: true,
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