import type {
  PrincipalResolvedAuditEvent,
  ResolveSessionErrorCode,
} from "@xypes-identity/shared";

import type { OperationalTelemetryRecorder } from "./operational-telemetry-types.js";

export interface VerifiedSessionToken {
  subject: string;
  email: string | null;
  expires_at: number;
}

export interface PrincipalRecord {
  principal_id: string;
  subject: string;
  email: string | null;
  status: "active" | "suspended";
}

export interface TenantMembershipRecord {
  tenant_id: string;
  principal_id: string;
  status: "active" | "suspended";
}

export interface PrincipalRepository {
  findBySubject(subject: string): Promise<PrincipalRecord | null>;
  findTenantMembership(input: {
    principalId: string;
    tenantId: string;
  }): Promise<TenantMembershipRecord | null>;
}

export interface SessionTokenVerifier {
  verify(token: string): Promise<VerifiedSessionToken>;
}

export interface AuditPublisher {
  publish(event: PrincipalResolvedAuditEvent): Promise<void>;
}

export interface DecisionIdGenerator {
  nextId(): string;
}

export interface Clock {
  now(): Date;
}

export interface ResolveSessionLogBindings {
  event_name: "resolve_session.result";
  tenant_id: string;
  subject: string | null;
  principal_id: string | null;
  decision_id: string | null;
  outcome: "resolved" | "error";
  error_code: ResolveSessionErrorCode | null;
  status_code: number | null;
}

export interface ResolveSessionLogger {
  info(bindings: ResolveSessionLogBindings, message: string): void;
  warn(bindings: ResolveSessionLogBindings, message: string): void;
}

export interface ResolveSessionDependencies {
  principalRepository: PrincipalRepository;
  tokenVerifier: SessionTokenVerifier;
  auditPublisher: AuditPublisher;
  decisionIdGenerator: DecisionIdGenerator;
  clock: Clock;
  sessionLogger?: ResolveSessionLogger;
  operationalTelemetry?: OperationalTelemetryRecorder;
}