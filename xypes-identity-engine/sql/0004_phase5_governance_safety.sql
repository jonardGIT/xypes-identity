CREATE TABLE role_toxic_combination (
  role_toxic_combination_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  role_definition_id_left UUID NOT NULL,
  role_definition_id_right UUID NOT NULL,
  conflict_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  CHECK (role_definition_id_left <> role_definition_id_right),
  FOREIGN KEY (tenant_id, role_definition_id_left)
    REFERENCES role_definition(tenant_id, role_definition_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, role_definition_id_right)
    REFERENCES role_definition(tenant_id, role_definition_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX role_toxic_combination_pair_unique_idx
  ON role_toxic_combination (
    tenant_id,
    LEAST(role_definition_id_left::text, role_definition_id_right::text),
    GREATEST(role_definition_id_left::text, role_definition_id_right::text)
  );

CREATE INDEX role_toxic_combination_left_lookup_idx
  ON role_toxic_combination (tenant_id, role_definition_id_left);

CREATE INDEX role_toxic_combination_right_lookup_idx
  ON role_toxic_combination (tenant_id, role_definition_id_right);