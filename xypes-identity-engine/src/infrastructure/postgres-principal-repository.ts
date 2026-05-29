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

export class PostgresPrincipalRepository implements PrincipalRepository {
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
}