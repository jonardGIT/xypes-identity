ALTER TABLE role_binding
  ADD COLUMN role_binding_status TEXT NOT NULL DEFAULT 'active'
  CHECK (role_binding_status IN ('eligible', 'active'));

CREATE INDEX role_binding_status_subject_principal_lookup_idx
  ON role_binding (tenant_id, role_binding_status, subject_principal_id, scope_type, scope_application_id)
  WHERE subject_principal_id IS NOT NULL;

CREATE INDEX role_binding_status_subject_group_lookup_idx
  ON role_binding (tenant_id, role_binding_status, subject_group_id, scope_type, scope_application_id)
  WHERE subject_group_id IS NOT NULL;