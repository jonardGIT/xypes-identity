import type {
  IdentityReconciliationAnomaly,
  IdentityReconciliationRepository,
  IdentityReconciliationSnapshot,
} from "../domain/identity-reconciliation-types.js";
import type {
  PrincipalRecord,
  PrincipalRepository,
  TenantMembershipRecord,
} from "../domain/session-types.js";

interface QueryResultRow {
  [key: string]: unknown;
}

interface DatabaseClient {
  query<Row extends QueryResultRow>(
    queryText: string,
    values: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

interface PrincipalRow extends QueryResultRow {
  principal_id: string;
  subject: string;
  email: string | null;
  status: "active" | "suspended";
}

interface TenantMembershipRow extends QueryResultRow {
  tenant_id: string;
  principal_id: string;
  status: "active" | "suspended";
}

interface CountRow extends QueryResultRow {
  total: string | number;
}

interface IdentityReconciliationAnomalyRow extends QueryResultRow {
  code: IdentityReconciliationAnomaly["code"];
  principal_id: string | null;
  subject: string | null;
  tenant_id: string | null;
  observed_count: string | number;
}

export class PostgresPrincipalRepository
  implements PrincipalRepository, IdentityReconciliationRepository
{
  constructor(private readonly databaseClient: DatabaseClient) {}

  async findBySubject(subject: string): Promise<PrincipalRecord | null> {
    const result = await this.databaseClient.query<PrincipalRow>(
      `SELECT principal_id, subject, email, status
       FROM principal
       WHERE subject = $1
       LIMIT 1`,
      [subject],
    );

    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      principal_id: row.principal_id,
      subject: row.subject,
      email: row.email,
      status: row.status,
    };
  }

  async findTenantMembership(input: {
    principalId: string;
    tenantId: string;
  }): Promise<TenantMembershipRecord | null> {
    const result = await this.databaseClient.query<TenantMembershipRow>(
      `SELECT tenant_id, principal_id, status
       FROM tenant_membership
       WHERE principal_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [input.principalId, input.tenantId],
    );

    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      tenant_id: row.tenant_id,
      principal_id: row.principal_id,
      status: row.status,
    };
  }

  async scanIdentityReconciliation(): Promise<IdentityReconciliationSnapshot> {
    const principalCountResult = await this.databaseClient.query<CountRow>(
      `SELECT COUNT(*) AS total
       FROM principal`,
      [],
    );

    const membershipCountResult = await this.databaseClient.query<CountRow>(
      `SELECT COUNT(*) AS total
       FROM tenant_membership`,
      [],
    );

    const anomalyResult = await this.databaseClient.query<IdentityReconciliationAnomalyRow>(
      `WITH orphaned_principals AS (
         SELECT
           'ORPHANED_PRINCIPAL'::text AS code,
           principal.principal_id::text AS principal_id,
           principal.subject,
           NULL::text AS tenant_id,
           1::bigint AS observed_count
         FROM principal
         LEFT JOIN tenant_membership
           ON tenant_membership.principal_id = principal.principal_id
         WHERE tenant_membership.principal_id IS NULL
       ),
       duplicate_subject_mappings AS (
         SELECT
           'DUPLICATE_SUBJECT_MAPPING'::text AS code,
           NULL::text AS principal_id,
           principal.subject,
           NULL::text AS tenant_id,
           COUNT(*)::bigint AS observed_count
         FROM principal
         GROUP BY principal.subject
         HAVING COUNT(*) > 1
       ),
       suspended_principal_active_memberships AS (
         SELECT
           'SUSPENDED_PRINCIPAL_ACTIVE_MEMBERSHIP'::text AS code,
           principal.principal_id::text AS principal_id,
           principal.subject,
           tenant_membership.tenant_id::text AS tenant_id,
           1::bigint AS observed_count
         FROM principal
         INNER JOIN tenant_membership
           ON tenant_membership.principal_id = principal.principal_id
         WHERE principal.status = 'suspended'
           AND tenant_membership.status = 'active'
       )
       SELECT code, principal_id, subject, tenant_id, observed_count
       FROM orphaned_principals
       UNION ALL
       SELECT code, principal_id, subject, tenant_id, observed_count
       FROM duplicate_subject_mappings
       UNION ALL
       SELECT code, principal_id, subject, tenant_id, observed_count
       FROM suspended_principal_active_memberships
       ORDER BY code, subject NULLS LAST, principal_id NULLS LAST, tenant_id NULLS LAST`,
      [],
    );

    return {
      principals_scanned: Number(principalCountResult.rows[0]?.total ?? 0),
      tenant_memberships_scanned: Number(membershipCountResult.rows[0]?.total ?? 0),
      anomalies: anomalyResult.rows.map((row) => ({
        code: row.code,
        principal_id: row.principal_id,
        subject: row.subject,
        tenant_id: row.tenant_id,
        observed_count: Number(row.observed_count),
      })),
    };
  }
}