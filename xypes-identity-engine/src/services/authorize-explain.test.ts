import assert from "node:assert/strict";
import test from "node:test";

import type { AuthorizationPrincipalAccessState } from "../domain/authorization-types.js";
import type { AuthorizationRepository } from "../domain/authorization-types.js";
import type { DecisionIdGenerator } from "../domain/session-types.js";
import type {
  AuthorizationDecisionLogBindings,
  AuthorizationSpan,
  AuthorizationTelemetry,
} from "./authorization-observability.js";
import { authorizeExplain } from "./authorize-explain.js";

type AuthorizationExplainInput = Parameters<
  AuthorizationRepository["findDirectPrincipalAllowBindings"]
>[0];

type AuthorizationMatchedBindings = Awaited<
  ReturnType<AuthorizationRepository["findDirectPrincipalAllowBindings"]>
>;

type AuthorizationDenyPolicies = Awaited<
  ReturnType<AuthorizationRepository["findDirectPrincipalDenyPolicies"]>
>;

type AuthorizationTraversalHits = Awaited<
  ReturnType<AuthorizationRepository["findPrincipalGroupTraversalHits"]>
>;

type AuthorizationScopeType = "platform" | "tenant" | "application" | "resource";

interface GroupMembershipFixture {
  tenant_id: string;
  group_id: string;
  member_principal_id: string | null;
  member_group_id: string | null;
}

type BindingFixture = {
  role_binding_id: string;
  role_definition_id: string;
  permission_id: string;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  tenant_id: string;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  action: string;
  application_id: string;
  resource_type: string;
};

type DenyFixture = {
  deny_policy_id: string;
  permission_id: string;
  scope_type: AuthorizationScopeType;
  scope_application_id: string | null;
  scope_resource_type: string | null;
  scope_resource_id: string | null;
  reason: string | null;
  tenant_id: string;
  subject_principal_id: string | null;
  subject_group_id: string | null;
  action: string;
  application_id: string;
  resource_type: string;
};

const scopeRank: Record<AuthorizationScopeType, number> = {
  platform: 0,
  tenant: 1,
  application: 2,
  resource: 3,
};

const matchesScope = (
  record: {
    scope_type: AuthorizationScopeType;
    scope_application_id: string | null;
    scope_resource_type: string | null;
    scope_resource_id: string | null;
  },
  input: AuthorizationExplainInput,
): boolean => {
  if (record.scope_type === "platform" || record.scope_type === "tenant") {
    return true;
  }

  if (record.scope_type === "application") {
    return record.scope_application_id === input.application_id;
  }

  return (
    record.scope_application_id === input.application_id
    && record.scope_resource_type === input.resource_type
    && input.resource_id !== null
    && record.scope_resource_id === input.resource_id
  );
};

class GraphAuthorizationRepository implements AuthorizationRepository {
  constructor(
    private readonly bindings: BindingFixture[],
    private readonly denyPolicies: DenyFixture[],
    private readonly groupMemberships: GroupMembershipFixture[],
    private readonly maxDepth = 16,
  ) {}

  async findDirectPrincipalAllowBindings(
    input: AuthorizationExplainInput,
  ): Promise<AuthorizationMatchedBindings> {
    const groupDepths = this.expandGroupDepths(input);

    return this.bindings
      .filter((binding) => this.matchesBinding(binding, input, groupDepths))
      .sort((left, right) => this.compareSubjects(left, right, groupDepths))
      .map((binding) => ({
        role_binding_id: binding.role_binding_id,
        role_definition_id: binding.role_definition_id,
        permission_id: binding.permission_id,
        scope_type: binding.scope_type,
        scope_application_id: binding.scope_application_id,
        scope_resource_type: binding.scope_resource_type,
        scope_resource_id: binding.scope_resource_id,
        subject: {
          subject_type: binding.subject_principal_id !== null ? "principal" : "group",
          subject_principal_id: binding.subject_principal_id,
          subject_group_id: binding.subject_group_id,
          membership_depth: binding.subject_principal_id !== null
            ? null
            : groupDepths.get(binding.subject_group_id ?? "") ?? null,
        },
      }));
  }

  async findDirectPrincipalDenyPolicies(
    input: AuthorizationExplainInput,
  ): Promise<AuthorizationDenyPolicies> {
    const groupDepths = this.expandGroupDepths(input);

    return this.denyPolicies
      .filter((denyPolicy) => this.matchesDeny(denyPolicy, input, groupDepths))
      .sort((left, right) => this.compareSubjects(left, right, groupDepths))
      .map((denyPolicy) => ({
        deny_policy_id: denyPolicy.deny_policy_id,
        permission_id: denyPolicy.permission_id,
        scope_type: denyPolicy.scope_type,
        scope_application_id: denyPolicy.scope_application_id,
        scope_resource_type: denyPolicy.scope_resource_type,
        scope_resource_id: denyPolicy.scope_resource_id,
        reason: denyPolicy.reason,
        subject: {
          subject_type: denyPolicy.subject_principal_id !== null ? "principal" : "group",
          subject_principal_id: denyPolicy.subject_principal_id,
          subject_group_id: denyPolicy.subject_group_id,
          membership_depth: denyPolicy.subject_principal_id !== null
            ? null
            : groupDepths.get(denyPolicy.subject_group_id ?? "") ?? null,
        },
      }));
  }

  async findPrincipalGroupTraversalHits(
    input: AuthorizationExplainInput,
  ): Promise<AuthorizationTraversalHits> {
    return this.expandTraversalHits(input);
  }

  private expandGroupDepths(input: AuthorizationExplainInput): Map<string, number> {
    return new Map(this.expandTraversalHits(input).map((hit) => [hit.group_id, hit.depth]));
  }

  private expandTraversalHits(input: AuthorizationExplainInput): AuthorizationTraversalHits {
    const hits = new Map<string, { depth: number; via_group_id: string | null }>();
    const queue: Array<{ group_id: string; depth: number; via_group_id: string | null }> = this.groupMemberships
      .filter(
        (membership) =>
          membership.tenant_id === input.tenant_id
          && membership.member_principal_id === input.principal_id,
      )
      .map((membership) => ({
        group_id: membership.group_id,
        depth: 1,
        via_group_id: null,
      }));

    while (queue.length > 0) {
      const current = queue.shift();

      if (current === undefined) {
        continue;
      }

      const existingHit = hits.get(current.group_id);

      if (
        existingHit !== undefined
        && (existingHit.depth < current.depth
          || (existingHit.depth === current.depth
            && (existingHit.via_group_id ?? "") <= (current.via_group_id ?? "")))
      ) {
        continue;
      }

      hits.set(current.group_id, {
        depth: current.depth,
        via_group_id: current.via_group_id,
      });

      if (current.depth >= this.maxDepth) {
        continue;
      }

      for (const membership of this.groupMemberships) {
        if (
          membership.tenant_id === input.tenant_id
          && membership.member_group_id === current.group_id
        ) {
          queue.push({
            group_id: membership.group_id,
            depth: current.depth + 1,
            via_group_id: membership.member_group_id,
          });
        }
      }
    }

    return [...hits.entries()]
      .map(([group_id, hit]) => ({
        group_id,
        depth: hit.depth,
        via_group_id: hit.via_group_id,
      }))
      .sort((left, right) => {
        if (left.depth !== right.depth) {
          return left.depth - right.depth;
        }

        const groupIdComparison = left.group_id.localeCompare(right.group_id);

        if (groupIdComparison !== 0) {
          return groupIdComparison;
        }

        return (left.via_group_id ?? "").localeCompare(right.via_group_id ?? "");
      });
  }

  private matchesBinding(
    binding: BindingFixture,
    input: AuthorizationExplainInput,
    groupDepths: Map<string, number>,
  ): boolean {
    return (
      binding.tenant_id === input.tenant_id
      && binding.application_id === input.application_id
      && binding.action === input.action
      && binding.resource_type === input.resource_type
      && this.matchesSubject(binding.subject_principal_id, binding.subject_group_id, input, groupDepths)
      && matchesScope(binding, input)
    );
  }

  private matchesDeny(
    denyPolicy: DenyFixture,
    input: AuthorizationExplainInput,
    groupDepths: Map<string, number>,
  ): boolean {
    return (
      denyPolicy.tenant_id === input.tenant_id
      && denyPolicy.application_id === input.application_id
      && denyPolicy.action === input.action
      && denyPolicy.resource_type === input.resource_type
      && this.matchesSubject(
        denyPolicy.subject_principal_id,
        denyPolicy.subject_group_id,
        input,
        groupDepths,
      )
      && matchesScope(denyPolicy, input)
    );
  }

  private matchesSubject(
    subjectPrincipalId: string | null,
    subjectGroupId: string | null,
    input: AuthorizationExplainInput,
    groupDepths: Map<string, number>,
  ): boolean {
    return (
      subjectPrincipalId === input.principal_id
      || (subjectGroupId !== null && groupDepths.has(subjectGroupId))
    );
  }

  private compareSubjects(
    left: { scope_type: AuthorizationScopeType; subject_principal_id: string | null; subject_group_id: string | null; role_binding_id?: string; deny_policy_id?: string },
    right: { scope_type: AuthorizationScopeType; subject_principal_id: string | null; subject_group_id: string | null; role_binding_id?: string; deny_policy_id?: string },
    groupDepths: Map<string, number>,
  ): number {
    const scopeDifference = scopeRank[left.scope_type] - scopeRank[right.scope_type];

    if (scopeDifference !== 0) {
      return scopeDifference;
    }

    const leftSubjectRank = left.subject_principal_id !== null ? 0 : 1;
    const rightSubjectRank = right.subject_principal_id !== null ? 0 : 1;

    if (leftSubjectRank !== rightSubjectRank) {
      return leftSubjectRank - rightSubjectRank;
    }

    const leftDepth = left.subject_group_id === null ? 0 : (groupDepths.get(left.subject_group_id) ?? Number.MAX_SAFE_INTEGER);
    const rightDepth = right.subject_group_id === null ? 0 : (groupDepths.get(right.subject_group_id) ?? Number.MAX_SAFE_INTEGER);

    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    return (left.role_binding_id ?? left.deny_policy_id ?? "").localeCompare(
      right.role_binding_id ?? right.deny_policy_id ?? "",
    );
  }

  async findPrincipalAccessState(
    input: AuthorizationExplainInput,
  ): Promise<AuthorizationPrincipalAccessState | null> {
    const principalSuspended = input.principal_id === "principal-suspended";
    const membershipSuspended = input.principal_id === "principal-membership-suspended";

    if (!principalSuspended && !membershipSuspended) {
      return {
        principal_status: "active" as const,
        tenant_membership_status: "active" as const,
      };
    }

    return {
      principal_status: principalSuspended ? "suspended" as const : "active" as const,
      tenant_membership_status: membershipSuspended ? "suspended" as const : "active" as const,
    };
  }
}

const fixedDecisionIdGenerator: DecisionIdGenerator = {
  nextId: () => "decision-explain-123",
};

const baseRequest: AuthorizationExplainInput = {
  tenant_id: "tenant-1",
  principal_id: "principal-1",
  application_id: "application-1",
  action: "read",
  resource_type: "document",
  resource_id: "document-1",
};

class RecordingAuthorizationTelemetry implements AuthorizationTelemetry {
  spans: Array<{
    spanName: string;
    attributes: Record<string, string | number | boolean>;
    events: Record<string, string | number | boolean>;
    recordedExceptions: unknown[];
  }> = [];

  async runInSpan<T>(
    spanName: string,
    attributes: Record<string, string | number | boolean | null | undefined>,
    callback: (span: AuthorizationSpan) => Promise<T>,
  ): Promise<T> {
    const spanState = {
      spanName,
      attributes: Object.fromEntries(
        Object.entries(attributes).filter(
          (entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null,
        ),
      ),
      events: {} as Record<string, string | number | boolean>,
      recordedExceptions: [] as unknown[],
    };

    this.spans.push(spanState);

    return callback({
      setAttribute: (name, value) => {
        spanState.events[name] = value;
      },
      recordException: (error) => {
        spanState.recordedExceptions.push(error);
      },
    });
  }
}

test("authorizeExplain returns nested group allow trace data", async () => {
  const result = await authorizeExplain(baseRequest, {
    authorizationRepository: new GraphAuthorizationRepository(
      [
        {
          role_binding_id: "binding-nested-1",
          role_definition_id: "role-1",
          permission_id: "permission-1",
          tenant_id: "tenant-1",
          subject_principal_id: null,
          subject_group_id: "group-2",
          action: "read",
          application_id: "application-1",
          resource_type: "document",
          scope_type: "application",
          scope_application_id: "application-1",
          scope_resource_type: null,
          scope_resource_id: null,
        },
      ],
      [],
      [
        {
          tenant_id: "tenant-1",
          group_id: "group-1",
          member_principal_id: "principal-1",
          member_group_id: null,
        },
        {
          tenant_id: "tenant-1",
          group_id: "group-2",
          member_principal_id: null,
          member_group_id: "group-1",
        },
      ],
    ),
    decisionIdGenerator: fixedDecisionIdGenerator,
  });

  assert.deepEqual(result, {
    outcome: "allow",
    decision_id: "decision-explain-123",
    reason_code: "ALLOW_MATCHED_BINDING",
    matched_bindings: [
      {
        role_binding_id: "binding-nested-1",
        role_definition_id: "role-1",
        permission_id: "permission-1",
        scope_type: "application",
        scope_application_id: "application-1",
        scope_resource_type: null,
        scope_resource_id: null,
      },
    ],
    deny_source: undefined,
    trace: {
      allow_matches: [
        {
          role_binding_id: "binding-nested-1",
          subject: {
            subject_type: "group",
            subject_principal_id: null,
            subject_group_id: "group-2",
            membership_depth: 2,
          },
        },
      ],
      deny_matches: [],
      traversal_hits: [
        {
          group_id: "group-1",
          depth: 1,
          via_group_id: null,
        },
        {
          group_id: "group-2",
          depth: 2,
          via_group_id: "group-1",
        },
      ],
    },
  });
});

test("authorizeExplain returns deny explanation when a broader deny overrides allow", async () => {
  const result = await authorizeExplain(baseRequest, {
    authorizationRepository: new GraphAuthorizationRepository(
      [
        {
          role_binding_id: "binding-1",
          role_definition_id: "role-1",
          permission_id: "permission-1",
          tenant_id: "tenant-1",
          subject_principal_id: "principal-1",
          subject_group_id: null,
          action: "read",
          application_id: "application-1",
          resource_type: "document",
          scope_type: "resource",
          scope_application_id: "application-1",
          scope_resource_type: "document",
          scope_resource_id: "document-1",
        },
      ],
      [
        {
          deny_policy_id: "deny-tenant-1",
          permission_id: "permission-1",
          tenant_id: "tenant-1",
          subject_principal_id: null,
          subject_group_id: "group-deny",
          action: "read",
          application_id: "application-1",
          resource_type: "document",
          scope_type: "tenant",
          scope_application_id: null,
          scope_resource_type: null,
          scope_resource_id: null,
          reason: "Tenant-wide suspension",
        },
      ],
      [
        {
          tenant_id: "tenant-1",
          group_id: "group-deny",
          member_principal_id: "principal-1",
          member_group_id: null,
        },
      ],
    ),
    decisionIdGenerator: fixedDecisionIdGenerator,
  });

  assert.deepEqual(result, {
    outcome: "deny",
    decision_id: "decision-explain-123",
    reason_code: "DENY_MATCHED_POLICY",
    matched_bindings: [
      {
        role_binding_id: "binding-1",
        role_definition_id: "role-1",
        permission_id: "permission-1",
        scope_type: "resource",
        scope_application_id: "application-1",
        scope_resource_type: "document",
        scope_resource_id: "document-1",
      },
    ],
    deny_source: {
      deny_policy_id: "deny-tenant-1",
      permission_id: "permission-1",
      scope_type: "tenant",
      scope_application_id: null,
      scope_resource_type: null,
      scope_resource_id: null,
      reason: "Tenant-wide suspension",
    },
    trace: {
      allow_matches: [
        {
          role_binding_id: "binding-1",
          subject: {
            subject_type: "principal",
            subject_principal_id: "principal-1",
            subject_group_id: null,
            membership_depth: null,
          },
        },
      ],
      deny_matches: [
        {
          deny_policy_id: "deny-tenant-1",
          subject: {
            subject_type: "group",
            subject_principal_id: null,
            subject_group_id: "group-deny",
            membership_depth: 1,
          },
        },
      ],
      traversal_hits: [
        {
          group_id: "group-deny",
          depth: 1,
          via_group_id: null,
        },
      ],
    },
  });
});

test("authorizeExplain emits structured decision logs and span attributes", async () => {
  const telemetry = new RecordingAuthorizationTelemetry();
  const logEntries: AuthorizationDecisionLogBindings[] = [];

  const result = await authorizeExplain(baseRequest, {
    authorizationRepository: new GraphAuthorizationRepository(
      [
        {
          role_binding_id: "binding-1",
          role_definition_id: "role-1",
          permission_id: "permission-1",
          tenant_id: "tenant-1",
          subject_principal_id: "principal-1",
          subject_group_id: null,
          action: "read",
          application_id: "application-1",
          resource_type: "document",
          scope_type: "resource",
          scope_application_id: "application-1",
          scope_resource_type: "document",
          scope_resource_id: "document-1",
        },
      ],
      [],
      [],
    ),
    decisionIdGenerator: fixedDecisionIdGenerator,
    decisionLogger: {
      info: (bindings) => {
        logEntries.push(bindings);
      },
    },
    decisionTelemetry: telemetry,
  });

  assert.equal(result.decision_id, "decision-explain-123");
  assert.deepEqual(logEntries, [
    {
      event_name: "authorization.decision",
      operation: "authorize.explain",
      tenant_id: "tenant-1",
      principal_id: "principal-1",
      application_id: "application-1",
      action: "read",
      resource_type: "document",
      resource_id: "document-1",
      decision_id: "decision-explain-123",
      outcome: "allow",
      reason_code: "ALLOW_MATCHED_BINDING",
      matched_bindings_count: 1,
      deny_policy_id: null,
    },
  ]);
  assert.deepEqual(telemetry.spans, [
    {
      spanName: "authorization.authorize_explain",
      attributes: {
        "authorization.operation": "authorize.explain",
        "authorization.tenant_id": "tenant-1",
        "authorization.principal_id": "principal-1",
        "authorization.application_id": "application-1",
        "authorization.action": "read",
        "authorization.resource_type": "document",
        "authorization.resource_id": "document-1",
      },
      events: {
        "authorization.decision_id": "decision-explain-123",
        "authorization.outcome": "allow",
        "authorization.reason_code": "ALLOW_MATCHED_BINDING",
        "authorization.matched_bindings_count": 1,
        "authorization.traversal_hit_count": 0,
        "authorization.decision_cache_status": "disabled",
        "authorization.expansion_cache_status": "disabled",
      },
      recordedExceptions: [],
    },
  ]);
});

test("authorizeExplain returns a suspension-specific deny trace when the tenant membership is suspended", async () => {
  const result = await authorizeExplain(
    {
      ...baseRequest,
      principal_id: "principal-membership-suspended",
    },
    {
      authorizationRepository: new GraphAuthorizationRepository(
        [
          {
            role_binding_id: "binding-1",
            role_definition_id: "role-1",
            permission_id: "permission-1",
            tenant_id: "tenant-1",
            subject_principal_id: "principal-membership-suspended",
            subject_group_id: null,
            action: "read",
            application_id: "application-1",
            resource_type: "document",
            scope_type: "resource",
            scope_application_id: "application-1",
            scope_resource_type: "document",
            scope_resource_id: "document-1",
          },
        ],
        [],
        [],
      ),
      decisionIdGenerator: fixedDecisionIdGenerator,
    },
  );

  assert.deepEqual(result, {
    outcome: "deny",
    decision_id: "decision-explain-123",
    reason_code: "TENANT_MEMBERSHIP_SUSPENDED",
    matched_bindings: [],
    trace: {
      allow_matches: [],
      deny_matches: [],
      traversal_hits: [],
    },
  });
});