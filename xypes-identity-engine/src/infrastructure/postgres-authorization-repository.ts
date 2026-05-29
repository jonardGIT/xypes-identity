import type {
  AuthorizationPrincipalAccessState,
  AuthorizationBindingRecord,
  AuthorizationDenyRecord,
  AuthorizationRepository,
  AuthorizationTraversalHitRecord,
} from "../domain/authorization-types.js";

type AuthorizationCheckRequest = Parameters<
  AuthorizationRepository["findDirectPrincipalAllowBindings"]
>[0];

type AuthorizationScopeType = "platform" | "tenant" | "application" | "resource";

interface QueryResultRow {
  [key: string]: unknown;
}

interface DatabaseClient {
  query<Row extends QueryResultRow>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

interface AuthorizationBindingRow extends QueryResultRow {
  role_binding_id: string;
  role_definition_id: string;
  permission_id: string;
  role_binding_status: "eligible" | "active";
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  matched_depth: number | null;
}

interface AuthorizationDenyRow extends QueryResultRow {
  deny_policy_id: string;
  permission_id: string;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  reason: string | null;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  matched_depth: number | null;
}

interface AuthorizationTraversalHitRow extends QueryResultRow {
  group_id: string;
  depth: number;
  via_group_id: string | null;
}

interface AuthorizationPrincipalAccessStateRow extends QueryResultRow {
  principal_status: "active" | "suspended";
  tenant_membership_status: "active" | "suspended" | null;
}

export const DEFAULT_GROUP_TRAVERSAL_DEPTH = 16;

const buildExpandedGroupsCte = (): string => `WITH RECURSIVE expanded_groups AS (
  SELECT
    gm.group_id,
    1 AS depth,
    NULL::text AS via_group_id
  FROM group_membership AS gm
  WHERE gm.tenant_id = $1
    AND gm.member_principal_id = $2

  UNION

  SELECT
    gm.group_id,
    eg.depth + 1 AS depth,
    gm.member_group_id AS via_group_id
  FROM group_membership AS gm
  INNER JOIN expanded_groups AS eg
    ON gm.tenant_id = $1
   AND gm.member_group_id = eg.group_id
  WHERE eg.depth < $7
),
resolved_groups AS (
  SELECT
    group_id,
    depth,
    via_group_id
  FROM (
    SELECT
      group_id,
      depth,
      via_group_id,
      ROW_NUMBER() OVER (
        PARTITION BY group_id
        ORDER BY depth ASC, COALESCE(via_group_id, '') ASC
      ) AS row_number
    FROM expanded_groups
  ) AS ranked_groups
  WHERE row_number = 1
)`;

const buildScopeMatchClause = (): string => `(
  target.scope_type = 'platform'
  OR target.scope_type = 'tenant'
  OR (
    target.scope_type = 'application'
    AND target.scope_application_id = $3
  )
  OR (
    target.scope_type = 'resource'
    AND target.scope_application_id = $3
    AND target.scope_resource_type = $5
    AND $4 IS NOT NULL
    AND target.scope_resource_id = $4
  )
)`;

export class PostgresAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly databaseClient: DatabaseClient) {}

  async findPrincipalAccessState(
    input: AuthorizationCheckRequest,
  ): Promise<AuthorizationPrincipalAccessState | null> {
    const result = await this.databaseClient.query<AuthorizationPrincipalAccessStateRow>(
      `SELECT
         principal.status AS principal_status,
         tenant_membership.status AS tenant_membership_status
       FROM principal
       LEFT JOIN tenant_membership
         ON tenant_membership.tenant_id = $1
        AND tenant_membership.principal_id = principal.principal_id
       WHERE principal.principal_id = $2`,
      [input.tenant_id, input.principal_id],
    );

    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      principal_status: row.principal_status,
      tenant_membership_status: row.tenant_membership_status,
    };
  }

  async findDirectPrincipalAllowBindings(
    input: AuthorizationCheckRequest,
  ): Promise<AuthorizationBindingRecord[]> {
    const result = await this.databaseClient.query<AuthorizationBindingRow>(
      `${buildExpandedGroupsCte()}
       SELECT
         rb.role_binding_id,
         rb.role_definition_id,
         permission.permission_id,
         rb.role_binding_status,
         rb.scope_type,
         rb.scope_application_id,
         rb.scope_resource_type,
         rb.scope_resource_id,
         rb.subject_principal_id,
         rb.subject_group_id,
         COALESCE(rg.depth, NULL) AS matched_depth
       FROM role_binding AS rb
       INNER JOIN role_permission AS rp
         ON rp.tenant_id = rb.tenant_id
        AND rp.role_definition_id = rb.role_definition_id
       INNER JOIN permission
         ON permission.tenant_id = rp.tenant_id
        AND permission.permission_id = rp.permission_id
       LEFT JOIN resolved_groups AS rg
         ON rg.group_id = rb.subject_group_id
       WHERE rb.tenant_id = $1
         AND rb.role_binding_status = 'active'
         AND permission.application_id = $3
         AND permission.action = $6
         AND permission.resource_type = $5
         AND (rb.subject_principal_id = $2 OR rg.group_id IS NOT NULL)
         AND ${buildScopeMatchClause().replaceAll("target", "rb")}
       ORDER BY
         CASE rb.scope_type
           WHEN 'platform' THEN 0
           WHEN 'tenant' THEN 1
           WHEN 'application' THEN 2
           ELSE 3
         END,
         CASE WHEN rb.subject_principal_id IS NOT NULL THEN 0 ELSE 1 END,
         COALESCE(rg.depth, 0) ASC,
         rb.role_binding_id ASC`,
      [
        input.tenant_id,
        input.principal_id,
        input.application_id,
        input.resource_id,
        input.resource_type,
        input.action,
        DEFAULT_GROUP_TRAVERSAL_DEPTH,
      ],
    );

    return result.rows.map((row) => ({
      role_binding_id: row.role_binding_id,
      role_definition_id: row.role_definition_id,
      permission_id: row.permission_id,
      scope_type: row.scope_type,
      scope_application_id: row.scope_application_id,
      scope_resource_type: row.scope_resource_type,
      scope_resource_id: row.scope_resource_id,
      subject: {
        subject_type: row.subject_principal_id !== null ? "principal" : "group",
        subject_principal_id: row.subject_principal_id,
        subject_group_id: row.subject_group_id,
        membership_depth: row.subject_principal_id !== null ? null : row.matched_depth,
      },
    }));
  }

  async findDirectPrincipalDenyPolicies(
    input: AuthorizationCheckRequest,
  ): Promise<AuthorizationDenyRecord[]> {
    const result = await this.databaseClient.query<AuthorizationDenyRow>(
      `${buildExpandedGroupsCte()}
       SELECT
         dp.deny_policy_id,
         dp.permission_id,
         dp.scope_type,
         dp.scope_application_id,
         dp.scope_resource_type,
         dp.scope_resource_id,
         dp.reason,
         dp.subject_principal_id,
         dp.subject_group_id,
         COALESCE(rg.depth, NULL) AS matched_depth
       FROM deny_policy AS dp
       INNER JOIN permission
         ON permission.tenant_id = dp.tenant_id
        AND permission.permission_id = dp.permission_id
       LEFT JOIN resolved_groups AS rg
         ON rg.group_id = dp.subject_group_id
       WHERE dp.tenant_id = $1
         AND permission.application_id = $3
         AND permission.action = $6
         AND permission.resource_type = $5
         AND (dp.subject_principal_id = $2 OR rg.group_id IS NOT NULL)
         AND ${buildScopeMatchClause().replaceAll("target", "dp")}
       ORDER BY
         CASE dp.scope_type
           WHEN 'platform' THEN 0
           WHEN 'tenant' THEN 1
           WHEN 'application' THEN 2
           ELSE 3
         END,
         CASE WHEN dp.subject_principal_id IS NOT NULL THEN 0 ELSE 1 END,
         COALESCE(rg.depth, 0) ASC,
         dp.deny_policy_id ASC`,
      [
        input.tenant_id,
        input.principal_id,
        input.application_id,
        input.resource_id,
        input.resource_type,
        input.action,
        DEFAULT_GROUP_TRAVERSAL_DEPTH,
      ],
    );

    return result.rows.map((row) => ({
      deny_policy_id: row.deny_policy_id,
      permission_id: row.permission_id,
      scope_type: row.scope_type,
      scope_application_id: row.scope_application_id,
      scope_resource_type: row.scope_resource_type,
      scope_resource_id: row.scope_resource_id,
      reason: row.reason,
      subject: {
        subject_type: row.subject_principal_id !== null ? "principal" : "group",
        subject_principal_id: row.subject_principal_id,
        subject_group_id: row.subject_group_id,
        membership_depth: row.subject_principal_id !== null ? null : row.matched_depth,
      },
    }));
  }

  async findPrincipalGroupTraversalHits(
    input: AuthorizationCheckRequest,
  ): Promise<AuthorizationTraversalHitRecord[]> {
    const result = await this.databaseClient.query<AuthorizationTraversalHitRow>(
      `${buildExpandedGroupsCte()}
       SELECT
         rg.group_id,
         rg.depth,
         rg.via_group_id
       FROM resolved_groups AS rg
       ORDER BY rg.depth ASC, rg.group_id ASC, COALESCE(rg.via_group_id, '') ASC`,
      [
        input.tenant_id,
        input.principal_id,
        input.application_id,
        input.resource_id,
        input.resource_type,
        input.action,
        DEFAULT_GROUP_TRAVERSAL_DEPTH,
      ],
    );

    return result.rows.map((row) => ({
      group_id: row.group_id,
      depth: row.depth,
      via_group_id: row.via_group_id,
    }));
  }
}