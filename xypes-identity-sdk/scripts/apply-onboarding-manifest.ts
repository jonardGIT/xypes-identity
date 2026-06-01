import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  applyOnboardingManifest,
  createXypesIdentityClient,
  type ApplyOnboardingManifestOptions,
  type XypesIdentityOnboardingManifest,
} from "../src/index.js";

interface ParsedArgs {
  baseUrl: string;
  manifestPath: string;
  actorSubject: string;
  actorPrincipalId?: string;
  reason?: string;
  dryRun: boolean;
}

const parseArgs = (argv: string[]): ParsedArgs => {
  const parsed: Partial<ParsedArgs> = {
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const nextValue = argv[index + 1];

    if (value === "--base-url") {
      parsed.baseUrl = nextValue;
      index += 1;
    } else if (value === "--manifest") {
      parsed.manifestPath = nextValue;
      index += 1;
    } else if (value === "--actor-subject") {
      parsed.actorSubject = nextValue;
      index += 1;
    } else if (value === "--actor-principal-id") {
      parsed.actorPrincipalId = nextValue;
      index += 1;
    } else if (value === "--reason") {
      parsed.reason = nextValue;
      index += 1;
    } else if (value === "--dry-run") {
      parsed.dryRun = true;
    }
  }

  if (
    parsed.baseUrl === undefined ||
    parsed.manifestPath === undefined ||
    parsed.actorSubject === undefined
  ) {
    throw new Error(
      "Usage: npm run onboarding:apply -- --base-url <url> --manifest <file> --actor-subject <subject> [--actor-principal-id <principal>] [--reason <reason>] [--dry-run]",
    );
  }

  return parsed as ParsedArgs;
};

const loadManifest = async (
  manifestPath: string,
): Promise<XypesIdentityOnboardingManifest> => {
  const resolvedPath = path.resolve(process.cwd(), manifestPath);
  const contents = await readFile(resolvedPath, "utf8");

  return JSON.parse(contents) as XypesIdentityOnboardingManifest;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const client = createXypesIdentityClient({
    baseUrl: args.baseUrl,
  });
  const manifest = await loadManifest(args.manifestPath);

  const result = await applyOnboardingManifest({
    client,
    manifest,
    actor_subject: args.actorSubject,
    actor_principal_id: args.actorPrincipalId ?? null,
    reason: args.reason,
    dry_run: args.dryRun,
  } satisfies ApplyOnboardingManifestOptions);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

await main();
