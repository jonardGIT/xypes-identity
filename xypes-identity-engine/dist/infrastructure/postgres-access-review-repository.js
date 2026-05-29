const allFindingCodes = [
    "ORPHANED_GROUP_OWNER",
    "PRIVILEGED_ROLE_BINDING",
    "STALE_GROUP",
    "STALE_ROLE_BINDING",
];
const buildFindingId = (code, entityId) => `${code}:${entityId}`;
const mapStaleGroupRow = (row) => ({
    finding_id: buildFindingId("STALE_GROUP", row.group_id),
    code: "STALE_GROUP",
    severity: "medium",
    entity_type: "group",
    entity_id: row.group_id,
    title: `Group ${row.name} is stale`,
    detail: `The ${row.group_type} group has not been updated since ${row.updated_at}.`,
    evidence_ids: [row.group_id],
    observed_at: row.updated_at,
    scope_type: row.scope_type,
    scope_application_id: row.scope_application_id,
    scope_resource_type: row.scope_resource_type,
    scope_resource_id: row.scope_resource_id,
    owner_principal_id: row.owner_principal_id,
    subject_principal_id: null,
    subject_group_id: null,
    role_binding_status: null,
    role_definition_id: null,
    role_definition_name: null,
    role_definition_status: null,
    approval_required: null,
    permission_ids: [],
});
const mapOrphanedOwnerRow = (row) => ({
    finding_id: buildFindingId("ORPHANED_GROUP_OWNER", row.group_id),
    code: "ORPHANED_GROUP_OWNER",
    severity: "high",
    entity_type: "group",
    entity_id: row.group_id,
    title: `Group ${row.name} has an orphaned owner`,
    detail: "The owner principal is no longer active in tenant scope for this group.",
    evidence_ids: row.owner_principal_id === null ? [row.group_id] : [row.group_id, row.owner_principal_id],
    observed_at: row.updated_at,
    scope_type: row.scope_type,
    scope_application_id: row.scope_application_id,
    scope_resource_type: row.scope_resource_type,
    scope_resource_id: row.scope_resource_id,
    owner_principal_id: row.owner_principal_id,
    subject_principal_id: null,
    subject_group_id: null,
    role_binding_status: null,
    role_definition_id: null,
    role_definition_name: null,
    role_definition_status: null,
    approval_required: null,
    permission_ids: [],
});
const mapStaleRoleBindingRow = (row) => ({
    finding_id: buildFindingId("STALE_ROLE_BINDING", row.role_binding_id),
    code: "STALE_ROLE_BINDING",
    severity: "medium",
    entity_type: "role_binding",
    entity_id: row.role_binding_id,
    title: `Role binding for ${row.role_definition_name} is stale`,
    detail: `The role binding has not been updated since ${row.updated_at}.`,
    evidence_ids: [row.role_binding_id, row.role_definition_id],
    observed_at: row.updated_at,
    scope_type: row.scope_type,
    scope_application_id: row.scope_application_id,
    scope_resource_type: row.scope_resource_type,
    scope_resource_id: row.scope_resource_id,
    owner_principal_id: null,
    subject_principal_id: row.subject_principal_id,
    subject_group_id: row.subject_group_id,
    role_binding_status: row.role_binding_status,
    role_definition_id: row.role_definition_id,
    role_definition_name: row.role_definition_name,
    role_definition_status: row.role_definition_status,
    approval_required: row.approval_required,
    permission_ids: [],
});
const mapPrivilegedRoleBindingRow = (row) => ({
    finding_id: buildFindingId("PRIVILEGED_ROLE_BINDING", row.role_binding_id),
    code: "PRIVILEGED_ROLE_BINDING",
    severity: "high",
    entity_type: "role_binding",
    entity_id: row.role_binding_id,
    title: `Role binding for ${row.role_definition_name} carries privileged access`,
    detail: row.role_binding_status === "eligible"
        ? "The bound role requires approval and is currently eligible only, so it is not effective on authorize paths."
        : "The bound role requires approval and is currently active, so it is effective on authorize paths.",
    evidence_ids: [row.role_binding_id, row.role_definition_id, ...row.permission_ids],
    observed_at: row.updated_at,
    scope_type: row.scope_type,
    scope_application_id: row.scope_application_id,
    scope_resource_type: row.scope_resource_type,
    scope_resource_id: row.scope_resource_id,
    owner_principal_id: null,
    subject_principal_id: row.subject_principal_id,
    subject_group_id: row.subject_group_id,
    role_binding_status: row.role_binding_status,
    role_definition_id: row.role_definition_id,
    role_definition_name: row.role_definition_name,
    role_definition_status: row.role_definition_status,
    approval_required: row.approval_required,
    permission_ids: row.permission_ids,
});
const buildStaleGroupQuery = () => `SELECT
  g.group_id,
  g.name,
  g.group_type,
  g.owner_principal_id,
  g.scope_type,
  g.scope_application_id,
  g.scope_resource_type,
  g.scope_resource_id,
  g.updated_at::text AS updated_at
FROM "group" AS g
WHERE g.tenant_id = $1
  AND g.updated_at < $2::timestamptz
ORDER BY g.updated_at ASC, g.group_id ASC`;
const buildOrphanedOwnerQuery = () => `SELECT
  g.group_id,
  g.name,
  g.group_type,
  g.owner_principal_id,
  g.scope_type,
  g.scope_application_id,
  g.scope_resource_type,
  g.scope_resource_id,
  g.updated_at::text AS updated_at
FROM "group" AS g
LEFT JOIN tenant_membership AS tm
  ON tm.tenant_id = g.tenant_id
 AND tm.principal_id = g.owner_principal_id
 AND tm.status = 'active'
WHERE g.tenant_id = $1
  AND g.owner_principal_id IS NOT NULL
  AND tm.tenant_membership_id IS NULL
ORDER BY g.updated_at ASC, g.group_id ASC`;
const buildRoleBindingBaseSelect = () => `SELECT
  rb.role_binding_id,
  rb.role_binding_status,
  rb.role_definition_id,
  rd.name AS role_definition_name,
  rd.status AS role_definition_status,
  rd.approval_required,
  rb.subject_principal_id,
  rb.subject_group_id,
  rb.scope_type,
  rb.scope_application_id,
  rb.scope_resource_type,
  rb.scope_resource_id,
  rb.updated_at::text AS updated_at,
  COALESCE(
    ARRAY_AGG(rp.permission_id::text ORDER BY rp.permission_id::text)
      FILTER (WHERE rp.permission_id IS NOT NULL),
    ARRAY[]::text[]
  ) AS permission_ids
FROM role_binding AS rb
INNER JOIN role_definition AS rd
  ON rd.tenant_id = rb.tenant_id
 AND rd.role_definition_id = rb.role_definition_id
LEFT JOIN role_permission AS rp
  ON rp.tenant_id = rb.tenant_id
 AND rp.role_definition_id = rb.role_definition_id`;
const buildRoleBindingGroupBy = () => `GROUP BY
  rb.role_binding_id,
  rb.role_binding_status,
  rb.role_definition_id,
  rd.name,
  rd.status,
  rd.approval_required,
  rb.subject_principal_id,
  rb.subject_group_id,
  rb.scope_type,
  rb.scope_application_id,
  rb.scope_resource_type,
  rb.scope_resource_id,
  rb.updated_at`;
const buildStaleRoleBindingQuery = () => `${buildRoleBindingBaseSelect()}
WHERE rb.tenant_id = $1
  AND rb.updated_at < $2::timestamptz
${buildRoleBindingGroupBy()}
ORDER BY rb.updated_at ASC, rb.role_binding_id ASC`;
const buildPrivilegedRoleBindingQuery = () => `${buildRoleBindingBaseSelect()}
WHERE rb.tenant_id = $1
  AND rd.status = 'active'
  AND rd.approval_required = TRUE
${buildRoleBindingGroupBy()}
ORDER BY rb.updated_at ASC, rb.role_binding_id ASC`;
export class PostgresAccessReviewRepository {
    databasePool;
    constructor(databasePool) {
        this.databasePool = databasePool;
    }
    async listFindings(input) {
        const selectedCodes = input.finding_codes ?? allFindingCodes;
        const findings = [];
        for (const code of selectedCodes) {
            if (code === "STALE_GROUP") {
                const result = await this.databasePool.query(buildStaleGroupQuery(), [input.tenant_id, input.stale_cutoff_at]);
                findings.push(...result.rows.map(mapStaleGroupRow));
            }
            if (code === "ORPHANED_GROUP_OWNER") {
                const result = await this.databasePool.query(buildOrphanedOwnerQuery(), [input.tenant_id]);
                findings.push(...result.rows.map(mapOrphanedOwnerRow));
            }
            if (code === "STALE_ROLE_BINDING") {
                const result = await this.databasePool.query(buildStaleRoleBindingQuery(), [input.tenant_id, input.stale_cutoff_at]);
                findings.push(...result.rows.map(mapStaleRoleBindingRow));
            }
            if (code === "PRIVILEGED_ROLE_BINDING") {
                const result = await this.databasePool.query(buildPrivilegedRoleBindingQuery(), [input.tenant_id]);
                findings.push(...result.rows.map(mapPrivilegedRoleBindingRow));
            }
        }
        return findings;
    }
}
