ALTER TABLE role_definition
  ADD COLUMN approval_required BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE audit_event (
  audit_event_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_principal_id UUID REFERENCES principal(principal_id) ON DELETE SET NULL,
  actor_subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_payload JSONB,
  after_payload JSONB,
  correlation_id TEXT,
  reference_type TEXT,
  reference_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (before_payload IS NOT NULL OR after_payload IS NOT NULL)
);

CREATE TABLE outbox_event (
  outbox_event_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  topic TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::JSONB,
  correlation_id TEXT,
  reference_type TEXT,
  reference_id TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX role_definition_approval_required_idx
  ON role_definition (tenant_id, application_id, approval_required)
  WHERE approval_required = TRUE;

CREATE INDEX audit_event_tenant_occurred_at_idx
  ON audit_event (tenant_id, occurred_at DESC);

CREATE INDEX audit_event_entity_lookup_idx
  ON audit_event (tenant_id, entity_type, entity_id, occurred_at DESC);

CREATE INDEX audit_event_correlation_lookup_idx
  ON audit_event (tenant_id, correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX outbox_event_pending_delivery_idx
  ON outbox_event (available_at, created_at)
  WHERE published_at IS NULL;

CREATE INDEX outbox_event_tenant_aggregate_lookup_idx
  ON outbox_event (tenant_id, aggregate_type, aggregate_id, created_at DESC);

CREATE INDEX outbox_event_correlation_lookup_idx
  ON outbox_event (tenant_id, correlation_id)
  WHERE correlation_id IS NOT NULL;