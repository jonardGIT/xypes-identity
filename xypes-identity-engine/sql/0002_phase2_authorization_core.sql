CREATE TABLE application (
  application_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE (tenant_id, application_id),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE "group" (
  group_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  scope_application_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN ('manual', 'synced', 'rule_based')),
  owner_principal_id UUID REFERENCES principal(principal_id) ON DELETE RESTRICT,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant', 'application', 'resource')),
  scope_resource_type TEXT,
  scope_resource_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE (tenant_id, group_id),
  UNIQUE (tenant_id, name),
  CHECK (
    (scope_type = 'platform' AND scope_application_id IS NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'tenant' AND scope_application_id IS NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'application' AND scope_application_id IS NOT NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'resource' AND scope_application_id IS NOT NULL AND scope_resource_type IS NOT NULL AND scope_resource_id IS NOT NULL)
  ),
  FOREIGN KEY (tenant_id, scope_application_id)
    REFERENCES application(tenant_id, application_id) ON DELETE SET NULL
);

CREATE TABLE group_membership (
  group_membership_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  group_id UUID NOT NULL,
  member_principal_id UUID REFERENCES principal(principal_id) ON DELETE CASCADE,
  member_group_id UUID,
  membership_source TEXT NOT NULL CHECK (membership_source IN ('manual', 'synced', 'rule_based')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  CHECK (
    (member_principal_id IS NOT NULL AND member_group_id IS NULL)
    OR (member_principal_id IS NULL AND member_group_id IS NOT NULL)
  ),
  CHECK (member_group_id IS NULL OR member_group_id <> group_id),
  FOREIGN KEY (tenant_id, group_id)
    REFERENCES "group"(tenant_id, group_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, member_group_id)
    REFERENCES "group"(tenant_id, group_id) ON DELETE CASCADE
);

CREATE TABLE permission (
  permission_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  application_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE (tenant_id, permission_id),
  FOREIGN KEY (tenant_id, application_id)
    REFERENCES application(tenant_id, application_id) ON DELETE CASCADE,
  UNIQUE (tenant_id, application_id, action, resource_type)
);

CREATE TABLE role_definition (
  role_definition_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  application_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'deprecated', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  UNIQUE (tenant_id, role_definition_id),
  FOREIGN KEY (tenant_id, application_id)
    REFERENCES application(tenant_id, application_id) ON DELETE CASCADE,
  UNIQUE (tenant_id, application_id, name)
);

CREATE TABLE role_permission (
  role_permission_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  role_definition_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  FOREIGN KEY (tenant_id, role_definition_id)
    REFERENCES role_definition(tenant_id, role_definition_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, permission_id)
    REFERENCES permission(tenant_id, permission_id) ON DELETE CASCADE,
  UNIQUE (tenant_id, role_definition_id, permission_id)
);

CREATE TABLE role_binding (
  role_binding_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  role_definition_id UUID NOT NULL,
  subject_principal_id UUID REFERENCES principal(principal_id) ON DELETE CASCADE,
  subject_group_id UUID,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant', 'application', 'resource')),
  scope_application_id UUID,
  scope_resource_type TEXT,
  scope_resource_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  CHECK (
    (subject_principal_id IS NOT NULL AND subject_group_id IS NULL)
    OR (subject_principal_id IS NULL AND subject_group_id IS NOT NULL)
  ),
  CHECK (
    (scope_type = 'platform' AND scope_application_id IS NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'tenant' AND scope_application_id IS NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'application' AND scope_application_id IS NOT NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'resource' AND scope_application_id IS NOT NULL AND scope_resource_type IS NOT NULL AND scope_resource_id IS NOT NULL)
  ),
  FOREIGN KEY (tenant_id, role_definition_id)
    REFERENCES role_definition(tenant_id, role_definition_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, subject_group_id)
    REFERENCES "group"(tenant_id, group_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, scope_application_id)
    REFERENCES application(tenant_id, application_id) ON DELETE CASCADE
);

CREATE TABLE deny_policy (
  deny_policy_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  subject_principal_id UUID REFERENCES principal(principal_id) ON DELETE CASCADE,
  subject_group_id UUID,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant', 'application', 'resource')),
  scope_application_id UUID,
  scope_resource_type TEXT,
  scope_resource_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  CHECK (
    (subject_principal_id IS NOT NULL AND subject_group_id IS NULL)
    OR (subject_principal_id IS NULL AND subject_group_id IS NOT NULL)
  ),
  CHECK (
    (scope_type = 'platform' AND scope_application_id IS NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'tenant' AND scope_application_id IS NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'application' AND scope_application_id IS NOT NULL AND scope_resource_type IS NULL AND scope_resource_id IS NULL)
    OR (scope_type = 'resource' AND scope_application_id IS NOT NULL AND scope_resource_type IS NOT NULL AND scope_resource_id IS NOT NULL)
  ),
  FOREIGN KEY (tenant_id, permission_id)
    REFERENCES permission(tenant_id, permission_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, subject_group_id)
    REFERENCES "group"(tenant_id, group_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, scope_application_id)
    REFERENCES application(tenant_id, application_id) ON DELETE CASCADE
);

CREATE INDEX application_tenant_lookup_idx
  ON application (tenant_id, slug, status);

CREATE INDEX group_tenant_lookup_idx
  ON "group" (tenant_id, scope_type, scope_application_id);

CREATE INDEX group_membership_group_lookup_idx
  ON group_membership (tenant_id, group_id);

CREATE INDEX group_membership_principal_lookup_idx
  ON group_membership (tenant_id, member_principal_id)
  WHERE member_principal_id IS NOT NULL;

CREATE INDEX group_membership_group_member_lookup_idx
  ON group_membership (tenant_id, member_group_id)
  WHERE member_group_id IS NOT NULL;

CREATE INDEX permission_tenant_lookup_idx
  ON permission (tenant_id, application_id, action, resource_type);

CREATE INDEX role_definition_tenant_lookup_idx
  ON role_definition (tenant_id, application_id, status);

CREATE INDEX role_permission_tenant_lookup_idx
  ON role_permission (tenant_id, role_definition_id, permission_id);

CREATE INDEX role_binding_subject_principal_lookup_idx
  ON role_binding (tenant_id, subject_principal_id, scope_type, scope_application_id)
  WHERE subject_principal_id IS NOT NULL;

CREATE INDEX role_binding_subject_group_lookup_idx
  ON role_binding (tenant_id, subject_group_id, scope_type, scope_application_id)
  WHERE subject_group_id IS NOT NULL;

CREATE INDEX deny_policy_subject_principal_lookup_idx
  ON deny_policy (tenant_id, subject_principal_id, scope_type, scope_application_id)
  WHERE subject_principal_id IS NOT NULL;

CREATE INDEX deny_policy_subject_group_lookup_idx
  ON deny_policy (tenant_id, subject_group_id, scope_type, scope_application_id)
  WHERE subject_group_id IS NOT NULL;