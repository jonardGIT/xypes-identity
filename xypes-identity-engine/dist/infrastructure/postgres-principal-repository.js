export class PostgresPrincipalRepository {
    databaseClient;
    constructor(databaseClient) {
        this.databaseClient = databaseClient;
    }
    async findBySubject(subject) {
        const result = await this.databaseClient.query(`SELECT principal_id, subject, email, status
       FROM principal
       WHERE subject = $1
       LIMIT 1`, [subject]);
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
    async findTenantMembership(input) {
        const result = await this.databaseClient.query(`SELECT tenant_id, principal_id, status
       FROM tenant_membership
       WHERE principal_id = $1 AND tenant_id = $2
       LIMIT 1`, [input.principalId, input.tenantId]);
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
