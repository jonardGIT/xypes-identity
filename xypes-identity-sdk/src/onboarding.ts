import type {
  ApplicationState,
  AttachRolePermissionResponse,
  PermissionState,
  RoleDefinitionState,
  RoleDefinitionStatus,
  UpdateRoleDefinitionStatusResponse,
} from "@xypes-identity/shared";

import type {
  XypesIdentityClient,
  XypesIdentityRequestOptions,
} from "./client.js";
import { XypesIdentityApiError } from "./errors.js";

export type XypesIdentityOnboardingControlPlaneClient = Pick<
  XypesIdentityClient["controlPlane"],
  | "attachRolePermission"
  | "createApplication"
  | "createPermission"
  | "createRoleDefinition"
  | "listApplications"
  | "listPermissions"
  | "listRoleDefinitions"
  | "updateRoleDefinitionStatus"
>;

export type XypesIdentityTenantResolutionRule =
  | "route_segment"
  | "trusted_subdomain"
  | "dedicated_internal_header";

export interface XypesIdentityIdentityBridgeMapping {
  supabase_project_ref: string;
  expected_jwt_issuer: string;
  expected_jwt_audience: string;
  tenant_resolution_rule: XypesIdentityTenantResolutionRule;
  tenant_resolution_detail: string;
  tenant_membership_bootstrap: string;
}

export interface XypesIdentityOnboardingManifest {
  tenant_id: string;
  identity_bridge_mapping: XypesIdentityIdentityBridgeMapping;
  application: {
    application_id?: string;
    slug: string;
    display_name: string;
  };
  permissions: Array<{
    ref?: string;
    action: string;
    resource_type: string;
    description: string | null;
  }>;
  role_definitions: Array<{
    name: string;
    description: string | null;
    approval_required: boolean;
    status?: RoleDefinitionStatus;
    permission_refs: string[];
  }>;
  validation_checklist?: string[];
}

export interface ApplyOnboardingManifestOptions {
  client: {
    controlPlane: XypesIdentityOnboardingControlPlaneClient;
  };
  manifest: XypesIdentityOnboardingManifest;
  actor_subject: string;
  actor_principal_id?: string | null;
  reason?: string;
  dry_run?: boolean;
  requestOptions?: XypesIdentityRequestOptions;
}

export interface ApplyOnboardingManifestResult {
  dry_run: boolean;
  identity_bridge_mapping: {
    automation_status: "manual_capture_only";
    captured: XypesIdentityIdentityBridgeMapping;
    manual_steps: string[];
  };
  application: {
    action: "existing" | "created" | "planned";
    application: ApplicationState | null;
    manifest_application_id: string | null;
  };
  permissions: Array<{
    ref: string;
    action: "existing" | "created" | "planned";
    permission: PermissionState | null;
  }>;
  role_definitions: Array<{
    name: string;
    action: "existing" | "created" | "planned";
    status_action: "unchanged" | "updated" | "planned";
    desired_status: RoleDefinitionStatus;
    role_definition: RoleDefinitionState | null;
    audit_event_id: string | null;
  }>;
  role_permissions: Array<{
    role_definition_name: string;
    permission_ref: string;
    action: "existing" | "attached" | "planned";
    audit_event_id: string | null;
  }>;
  warnings: string[];
}

export class XypesIdentityOnboardingManifestError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[]) {
    super(message);
    this.name = "XypesIdentityOnboardingManifestError";
    this.issues = issues;
  }
}

type ControlPlaneClient = XypesIdentityOnboardingControlPlaneClient;

const permissionKey = (input: {
  action: string;
  resource_type: string;
}): string => `${input.action}::${input.resource_type}`;

const normalizeNullableText = (
  value: string | null | undefined,
): string | null => (value === undefined ? null : value);

const createManifestReason = (
  baseReason: string,
  entityType: string,
  entityName: string,
): string => `${baseReason}: ${entityType} ${entityName}`;

const resolvePermissionRef = (
  permission: XypesIdentityOnboardingManifest["permissions"][number],
): string => permission.ref ?? permission.action;

const validateManifest = (
  manifest: XypesIdentityOnboardingManifest,
): {
  permissionRefs: Map<
    string,
    XypesIdentityOnboardingManifest["permissions"][number]
  >;
} => {
  const issues: string[] = [];
  const permissionRefs = new Map<
    string,
    XypesIdentityOnboardingManifest["permissions"][number]
  >();

  if (
    manifest.identity_bridge_mapping.supabase_project_ref.trim().length === 0
  ) {
    issues.push(
      "identity_bridge_mapping.supabase_project_ref must be non-empty.",
    );
  }

  if (
    manifest.identity_bridge_mapping.expected_jwt_issuer.trim().length === 0
  ) {
    issues.push(
      "identity_bridge_mapping.expected_jwt_issuer must be non-empty.",
    );
  }

  if (
    manifest.identity_bridge_mapping.expected_jwt_audience.trim().length === 0
  ) {
    issues.push(
      "identity_bridge_mapping.expected_jwt_audience must be non-empty.",
    );
  }

  if (
    manifest.identity_bridge_mapping.tenant_resolution_detail.trim().length ===
    0
  ) {
    issues.push(
      "identity_bridge_mapping.tenant_resolution_detail must be non-empty.",
    );
  }

  if (
    manifest.identity_bridge_mapping.tenant_membership_bootstrap.trim()
      .length === 0
  ) {
    issues.push(
      "identity_bridge_mapping.tenant_membership_bootstrap must be non-empty.",
    );
  }

  for (const permission of manifest.permissions) {
    const ref = resolvePermissionRef(permission);

    if (permissionRefs.has(ref)) {
      issues.push(`Duplicate permission ref '${ref}' in onboarding manifest.`);
      continue;
    }

    permissionRefs.set(ref, permission);
  }

  for (const roleDefinition of manifest.role_definitions) {
    for (const ref of roleDefinition.permission_refs) {
      if (!permissionRefs.has(ref)) {
        issues.push(
          `Role definition '${roleDefinition.name}' references unknown permission ref '${ref}'.`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new XypesIdentityOnboardingManifestError(
      "Onboarding manifest validation failed.",
      issues,
    );
  }

  return { permissionRefs };
};

const buildIdentityBridgeManualSteps = (
  mapping: XypesIdentityIdentityBridgeMapping,
): string[] => {
  const normalizeSentence = (value: string): string =>
    value.trim().replace(/[.\s]+$/u, "");

  return [
    `Confirm Supabase project '${mapping.supabase_project_ref}' is the issuer of the bearer tokens for this environment.`,
    `Verify the engine is configured with issuer '${mapping.expected_jwt_issuer}' and audience '${mapping.expected_jwt_audience}' before enforcement begins.`,
    `Implement and test tenant resolution via '${mapping.tenant_resolution_rule}': ${normalizeSentence(mapping.tenant_resolution_detail)}.`,
    `Document how principals gain tenant membership: ${normalizeSentence(mapping.tenant_membership_bootstrap)}.`,
  ];
};

const assertApplicationCompatibility = (
  manifest: XypesIdentityOnboardingManifest,
  application: ApplicationState,
): string[] => {
  const issues: string[] = [];

  if (application.display_name !== manifest.application.display_name) {
    issues.push(
      `Existing application slug '${application.slug}' uses display name '${application.display_name}', expected '${manifest.application.display_name}'.`,
    );
  }

  return issues;
};

const assertPermissionCompatibility = (
  manifestPermission: XypesIdentityOnboardingManifest["permissions"][number],
  permission: PermissionState,
): string[] => {
  const issues: string[] = [];
  const manifestDescription = normalizeNullableText(
    manifestPermission.description,
  );
  const existingDescription = normalizeNullableText(permission.description);

  if (manifestDescription !== existingDescription) {
    issues.push(
      `Existing permission '${manifestPermission.action}' on '${manifestPermission.resource_type}' uses description '${existingDescription ?? ""}', expected '${manifestDescription ?? ""}'.`,
    );
  }

  return issues;
};

const assertRoleDefinitionCompatibility = (
  manifestRoleDefinition: XypesIdentityOnboardingManifest["role_definitions"][number],
  roleDefinition: RoleDefinitionState,
): string[] => {
  const issues: string[] = [];
  const manifestDescription = normalizeNullableText(
    manifestRoleDefinition.description,
  );
  const existingDescription = normalizeNullableText(roleDefinition.description);

  if (existingDescription !== manifestDescription) {
    issues.push(
      `Existing role definition '${manifestRoleDefinition.name}' uses description '${existingDescription ?? ""}', expected '${manifestDescription ?? ""}'.`,
    );
  }

  if (
    roleDefinition.approval_required !==
    manifestRoleDefinition.approval_required
  ) {
    issues.push(
      `Existing role definition '${manifestRoleDefinition.name}' has approval_required=${roleDefinition.approval_required}, expected ${manifestRoleDefinition.approval_required}.`,
    );
  }

  return issues;
};

const resolveApplication = async (
  client: ControlPlaneClient,
  options: ApplyOnboardingManifestOptions,
): Promise<ApplyOnboardingManifestResult["application"]> => {
  const listed = await client.listApplications(
    {
      tenant_id: options.manifest.tenant_id,
      slug: options.manifest.application.slug,
      limit: 2,
    },
    options.requestOptions,
  );

  const existingApplication = listed.applications[0] ?? null;

  if (existingApplication !== null) {
    const issues = assertApplicationCompatibility(
      options.manifest,
      existingApplication,
    );

    if (issues.length > 0) {
      throw new XypesIdentityOnboardingManifestError(
        "Existing application state is incompatible with the onboarding manifest.",
        issues,
      );
    }

    return {
      action: "existing",
      application: existingApplication,
      manifest_application_id:
        options.manifest.application.application_id ?? null,
    };
  }

  if (options.dry_run === true) {
    return {
      action: "planned",
      application: null,
      manifest_application_id:
        options.manifest.application.application_id ?? null,
    };
  }

  const created = await client.createApplication(
    {
      tenant_id: options.manifest.tenant_id,
      slug: options.manifest.application.slug,
      display_name: options.manifest.application.display_name,
      actor_principal_id: options.actor_principal_id ?? null,
      actor_subject: options.actor_subject,
      reason: createManifestReason(
        options.reason ?? "Apply onboarding manifest",
        "application",
        options.manifest.application.slug,
      ),
    },
    options.requestOptions,
  );

  return {
    action: "created",
    application: created.application,
    manifest_application_id:
      options.manifest.application.application_id ?? null,
  };
};

const updateRoleDefinitionStatusIfNeeded = async (
  client: ControlPlaneClient,
  options: ApplyOnboardingManifestOptions,
  roleDefinition: RoleDefinitionState,
  desiredStatus: RoleDefinitionStatus,
): Promise<{
  statusAction: "unchanged" | "updated" | "planned";
  roleDefinition: RoleDefinitionState;
  audit_event_id: string | null;
}> => {
  if (roleDefinition.status === desiredStatus) {
    return {
      statusAction: "unchanged",
      roleDefinition,
      audit_event_id: null,
    };
  }

  if (options.dry_run === true) {
    return {
      statusAction: "planned",
      roleDefinition,
      audit_event_id: null,
    };
  }

  const updated = await client.updateRoleDefinitionStatus(
    {
      tenant_id: options.manifest.tenant_id,
      role_definition_id: roleDefinition.role_definition_id,
      status: desiredStatus,
      actor_principal_id: options.actor_principal_id ?? null,
      actor_subject: options.actor_subject,
      reason: createManifestReason(
        options.reason ?? "Apply onboarding manifest",
        "role definition status",
        roleDefinition.name,
      ),
    },
    options.requestOptions,
  );

  return {
    statusAction: "updated",
    roleDefinition: updated.role_definition,
    audit_event_id: updated.audit.audit_event_id,
  };
};

const createRolePermissionAttachment = async (
  client: ControlPlaneClient,
  options: ApplyOnboardingManifestOptions,
  roleDefinition: RoleDefinitionState,
  permission: PermissionState,
): Promise<{
  action: "existing" | "attached" | "planned";
  response: AttachRolePermissionResponse | null;
}> => {
  if (options.dry_run === true) {
    return {
      action: "planned",
      response: null,
    };
  }

  try {
    const response = await client.attachRolePermission(
      {
        tenant_id: options.manifest.tenant_id,
        role_definition_id: roleDefinition.role_definition_id,
        permission_id: permission.permission_id,
        actor_principal_id: options.actor_principal_id ?? null,
        actor_subject: options.actor_subject,
        reason: createManifestReason(
          options.reason ?? "Apply onboarding manifest",
          "role permission",
          `${roleDefinition.name}:${permission.action}`,
        ),
      },
      options.requestOptions,
    );

    return {
      action: "attached",
      response,
    };
  } catch (error) {
    if (
      error instanceof XypesIdentityApiError &&
      error.code === "ROLE_PERMISSION_DUPLICATE"
    ) {
      return {
        action: "existing",
        response: null,
      };
    }

    throw error;
  }
};

export const applyOnboardingManifest = async (
  options: ApplyOnboardingManifestOptions,
): Promise<ApplyOnboardingManifestResult> => {
  const { permissionRefs } = validateManifest(options.manifest);
  const resolvedApplication = await resolveApplication(
    options.client.controlPlane,
    options,
  );

  const warnings: string[] = [];

  if (
    resolvedApplication.application !== null &&
    options.manifest.application.application_id !== undefined &&
    options.manifest.application.application_id !==
      resolvedApplication.application.application_id
  ) {
    warnings.push(
      `Manifest application_id '${options.manifest.application.application_id}' is a consumer-side reference and does not match the engine application_id '${resolvedApplication.application.application_id}'.`,
    );
  }

  const applicationId =
    resolvedApplication.application?.application_id ??
    "__planned_application__";

  const listedPermissions =
    resolvedApplication.application === null
      ? []
      : (
          await options.client.controlPlane.listPermissions(
            {
              tenant_id: options.manifest.tenant_id,
              application_id: applicationId,
              limit: 500,
            },
            options.requestOptions,
          )
        ).permissions;
  const existingPermissionsByKey = new Map(
    listedPermissions.map((permission) => [
      permissionKey(permission),
      permission,
    ]),
  );

  const permissionResults: ApplyOnboardingManifestResult["permissions"] = [];
  const resolvedPermissionsByRef = new Map<string, PermissionState>();
  const permissionCompatibilityIssues: string[] = [];

  for (const permission of options.manifest.permissions) {
    const ref = resolvePermissionRef(permission);
    const existingPermission = existingPermissionsByKey.get(
      permissionKey(permission),
    );

    if (existingPermission !== undefined) {
      permissionCompatibilityIssues.push(
        ...assertPermissionCompatibility(permission, existingPermission),
      );
      resolvedPermissionsByRef.set(ref, existingPermission);
      permissionResults.push({
        ref,
        action: "existing",
        permission: existingPermission,
      });
      continue;
    }

    if (options.dry_run === true) {
      permissionResults.push({
        ref,
        action: "planned",
        permission: null,
      });
      continue;
    }

    const created = await options.client.controlPlane.createPermission(
      {
        tenant_id: options.manifest.tenant_id,
        application_id: applicationId,
        action: permission.action,
        resource_type: permission.resource_type,
        description: permission.description,
        actor_principal_id: options.actor_principal_id ?? null,
        actor_subject: options.actor_subject,
        reason: createManifestReason(
          options.reason ?? "Apply onboarding manifest",
          "permission",
          ref,
        ),
      },
      options.requestOptions,
    );

    resolvedPermissionsByRef.set(ref, created.permission);
    permissionResults.push({
      ref,
      action: "created",
      permission: created.permission,
    });
  }

  if (permissionCompatibilityIssues.length > 0) {
    throw new XypesIdentityOnboardingManifestError(
      "Existing permission state is incompatible with the onboarding manifest.",
      permissionCompatibilityIssues,
    );
  }

  const listedRoleDefinitions =
    resolvedApplication.application === null
      ? []
      : (
          await options.client.controlPlane.listRoleDefinitions(
            {
              tenant_id: options.manifest.tenant_id,
              application_id: applicationId,
              limit: 500,
            },
            options.requestOptions,
          )
        ).role_definitions;
  const existingRoleDefinitionsByName = new Map(
    listedRoleDefinitions.map((roleDefinition) => [
      roleDefinition.name,
      roleDefinition,
    ]),
  );

  const roleDefinitionResults: ApplyOnboardingManifestResult["role_definitions"] =
    [];
  const resolvedRoleDefinitionsByName = new Map<string, RoleDefinitionState>();
  const roleCompatibilityIssues: string[] = [];

  for (const roleDefinition of options.manifest.role_definitions) {
    const desiredStatus = roleDefinition.status ?? "active";
    const existingRoleDefinition = existingRoleDefinitionsByName.get(
      roleDefinition.name,
    );

    if (existingRoleDefinition !== undefined) {
      roleCompatibilityIssues.push(
        ...assertRoleDefinitionCompatibility(
          roleDefinition,
          existingRoleDefinition,
        ),
      );

      const updated = await updateRoleDefinitionStatusIfNeeded(
        options.client.controlPlane,
        options,
        existingRoleDefinition,
        desiredStatus,
      );

      resolvedRoleDefinitionsByName.set(
        roleDefinition.name,
        updated.roleDefinition,
      );
      roleDefinitionResults.push({
        name: roleDefinition.name,
        action: "existing",
        status_action: updated.statusAction,
        desired_status: desiredStatus,
        role_definition: updated.roleDefinition,
        audit_event_id: updated.audit_event_id,
      });
      continue;
    }

    if (options.dry_run === true) {
      roleDefinitionResults.push({
        name: roleDefinition.name,
        action: "planned",
        status_action: "planned",
        desired_status: desiredStatus,
        role_definition: null,
        audit_event_id: null,
      });
      continue;
    }

    const created = await options.client.controlPlane.createRoleDefinition(
      {
        tenant_id: options.manifest.tenant_id,
        application_id: applicationId,
        name: roleDefinition.name,
        description: roleDefinition.description,
        approval_required: roleDefinition.approval_required,
        actor_principal_id: options.actor_principal_id ?? null,
        actor_subject: options.actor_subject,
        reason: createManifestReason(
          options.reason ?? "Apply onboarding manifest",
          "role definition",
          roleDefinition.name,
        ),
      },
      options.requestOptions,
    );

    const updated = await updateRoleDefinitionStatusIfNeeded(
      options.client.controlPlane,
      options,
      created.role_definition,
      desiredStatus,
    );

    resolvedRoleDefinitionsByName.set(
      roleDefinition.name,
      updated.roleDefinition,
    );
    roleDefinitionResults.push({
      name: roleDefinition.name,
      action: "created",
      status_action: updated.statusAction,
      desired_status: desiredStatus,
      role_definition: updated.roleDefinition,
      audit_event_id: updated.audit_event_id ?? created.audit.audit_event_id,
    });
  }

  if (roleCompatibilityIssues.length > 0) {
    throw new XypesIdentityOnboardingManifestError(
      "Existing role-definition state is incompatible with the onboarding manifest.",
      roleCompatibilityIssues,
    );
  }

  const rolePermissionResults: ApplyOnboardingManifestResult["role_permissions"] =
    [];

  for (const roleDefinition of options.manifest.role_definitions) {
    const resolvedRoleDefinition = resolvedRoleDefinitionsByName.get(
      roleDefinition.name,
    );

    for (const permissionRef of roleDefinition.permission_refs) {
      const manifestPermission = permissionRefs.get(permissionRef);

      if (manifestPermission === undefined) {
        continue;
      }

      const resolvedPermission = resolvedPermissionsByRef.get(permissionRef);

      if (
        resolvedRoleDefinition === undefined ||
        resolvedPermission === undefined ||
        options.dry_run === true
      ) {
        rolePermissionResults.push({
          role_definition_name: roleDefinition.name,
          permission_ref: permissionRef,
          action: "planned",
          audit_event_id: null,
        });
        continue;
      }

      const attached = await createRolePermissionAttachment(
        options.client.controlPlane,
        options,
        resolvedRoleDefinition,
        resolvedPermission,
      );

      rolePermissionResults.push({
        role_definition_name: roleDefinition.name,
        permission_ref: permissionRef,
        action: attached.action,
        audit_event_id: attached.response?.audit.audit_event_id ?? null,
      });
    }
  }

  return {
    dry_run: options.dry_run === true,
    identity_bridge_mapping: {
      automation_status: "manual_capture_only",
      captured: options.manifest.identity_bridge_mapping,
      manual_steps: buildIdentityBridgeManualSteps(
        options.manifest.identity_bridge_mapping,
      ),
    },
    application: resolvedApplication,
    permissions: permissionResults,
    role_definitions: roleDefinitionResults,
    role_permissions: rolePermissionResults,
    warnings,
  };
};

export const isXypesIdentityOnboardingManifestError = (
  error: unknown,
): error is XypesIdentityOnboardingManifestError =>
  error instanceof XypesIdentityOnboardingManifestError;
