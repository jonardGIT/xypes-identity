-- Local-only seed data for dockerized resolve-session exercises.

INSERT INTO principal (
  principal_id,
  subject,
  email,
  status,
  created_by,
  updated_by
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'local-active-member',
    'active.member@example.test',
    'active',
    'local-dev-seed',
    'local-dev-seed'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'local-suspended-member',
    'suspended.member@example.test',
    'active',
    'local-dev-seed',
    'local-dev-seed'
  )
ON CONFLICT (subject) DO NOTHING;

INSERT INTO tenant_membership (
  tenant_membership_id,
  tenant_id,
  principal_id,
  status,
  created_by,
  updated_by
) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    'active',
    'local-dev-seed',
    'local-dev-seed'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '22222222-2222-2222-2222-222222222222',
    'suspended',
    'local-dev-seed',
    'local-dev-seed'
  )
ON CONFLICT (tenant_id, principal_id) DO NOTHING;