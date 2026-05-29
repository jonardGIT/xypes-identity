CREATE TABLE principal (
  principal_id UUID PRIMARY KEY,
  subject TEXT NOT NULL UNIQUE,
  email TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE tenant_membership (
  tenant_membership_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  principal_id UUID NOT NULL REFERENCES principal(principal_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE (tenant_id, principal_id)
);

CREATE INDEX tenant_membership_tenant_lookup_idx
  ON tenant_membership (tenant_id, principal_id, status);