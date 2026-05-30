export const renderOnboardingConsole = (): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>xypes-identity admin onboarding console</title>
    <style>
      :root {
        --bg: #efe7dd;
        --panel: rgba(255, 250, 244, 0.94);
        --panel-strong: #fffdf9;
        --ink: #1b2628;
        --muted: #5b6768;
        --accent: #0d6b5f;
        --accent-soft: rgba(13, 107, 95, 0.12);
        --line: rgba(27, 38, 40, 0.12);
        --warn: #8c5a1d;
        --shadow: 0 22px 70px rgba(48, 33, 17, 0.12);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        background:
          radial-gradient(circle at top right, rgba(13, 107, 95, 0.14), transparent 25%),
          radial-gradient(circle at left 15%, rgba(182, 98, 59, 0.16), transparent 28%),
          linear-gradient(180deg, #faf5ed 0%, var(--bg) 100%);
        font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
      }

      main {
        width: min(1280px, calc(100% - 32px));
        margin: 32px auto 48px;
      }

      .hero, .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }

      .hero { padding: 28px; margin-bottom: 20px; }
      .panel { padding: 20px; }

      .eyebrow {
        margin: 0 0 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
        font: 600 12px/1.4 "IBM Plex Mono", Consolas, monospace;
      }

      h1, h2, h3 { margin: 0; font-weight: 600; }
      h1 { font-size: clamp(2rem, 4.8vw, 3.4rem); line-height: 0.95; max-width: 11ch; }

      .hero-copy,
      .layout,
      .row,
      .summary-grid,
      .split {
        display: grid;
        gap: 16px;
      }

      .hero-copy { grid-template-columns: 1.1fr 0.9fr; align-items: end; }
      .layout { grid-template-columns: minmax(360px, 460px) minmax(0, 1fr); }
      .row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .split { grid-template-columns: repeat(2, minmax(0, 1fr)); }

      .hero p,
      label,
      input,
      textarea,
      select,
      button,
      .status,
      .summary-card,
      .pill,
      .artifact,
      .step-list,
      pre {
        font-family: "IBM Plex Mono", Consolas, monospace;
      }

      .hero p { margin: 0; color: var(--muted); line-height: 1.6; font-size: 0.95rem; }

      .stack { display: grid; gap: 16px; }
      form { display: grid; gap: 14px; }

      label {
        display: grid;
        gap: 8px;
        color: var(--muted);
        font-size: 0.77rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      input, textarea, select {
        width: 100%;
        border: 1px solid var(--line);
        background: var(--panel-strong);
        color: var(--ink);
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 0.92rem;
      }

      textarea { min-height: 92px; resize: vertical; }

      button {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        background: linear-gradient(135deg, #17353a, #0d6b5f);
        color: white;
        cursor: pointer;
        font-size: 0.9rem;
      }

      button.secondary { background: linear-gradient(135deg, #8c5a1d, #bf7a29); }
      button.tertiary {
        background: transparent;
        color: var(--ink);
        border: 1px solid var(--line);
      }

      button:disabled { opacity: 0.6; cursor: progress; }

      .status { min-height: 20px; color: var(--muted); font-size: 0.82rem; }

      .summary-card,
      .artifact,
      .step-list,
      .empty {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.76);
        padding: 14px;
      }

      .summary-card strong { display: block; font-size: 1.5rem; margin-bottom: 6px; }
      .artifact-title { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 10px; }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .pill { border-radius: 999px; padding: 6px 10px; background: var(--accent-soft); color: var(--muted); font-size: 0.78rem; }
      .empty { color: var(--muted); }
      .step-list { margin: 0; padding-left: 18px; }
      .step-list li { margin: 0 0 10px; }
      pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.8rem; }

      @media (max-width: 980px) {
        .hero-copy, .layout, .row, .summary-grid, .split { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">xypes-identity admin</div>
        <div class="hero-copy">
          <div><h1>Onboarding console</h1></div>
          <p>
            This console generates a reviewed starter manifest, captures Supabase project and tenant-routing decisions,
            previews the SDK onboarding apply path, and then applies the missing control-plane state without moving
            authorization or tenant resolution logic into admin.
          </p>
        </div>
      </section>

      <section class="layout">
        <div class="stack">
          <section class="panel">
            <div class="eyebrow">Application Seed</div>
            <form id="onboarding-form">
              <label>Tenant Id<input id="tenant-id" value="tenant_123" required /></label>
              <div class="row">
                <label>Application Slug<input id="application-slug" value="billing" required /></label>
                <label>Display Name<input id="display-name" value="Billing" required /></label>
              </div>
              <div class="row">
                <label>Manifest Application Id<input id="application-id" value="application_billing_123" required /></label>
                <label>Actor Subject<input id="actor-subject" value="onboarding.operator@example.test" required /></label>
              </div>
              <label>Actor Principal Id<input id="actor-principal-id" value="principal_onboarding_123" /></label>
              <label>Reason<textarea id="reason">Apply onboarding manifest from admin console</textarea></label>

              <div class="eyebrow">Identity Bridge Mapping</div>
              <div class="row">
                <label>Supabase Project Ref<input id="supabase-project-ref" value="billing-supabase-project" required /></label>
                <label>JWT Audience<input id="supabase-jwt-audience" value="authenticated" required /></label>
              </div>
              <label>JWT Issuer<input id="supabase-jwt-issuer" value="https://billing.supabase.co/auth/v1" required /></label>
              <div class="row">
                <label>Tenant Resolution Rule
                  <select id="tenant-resolution-rule">
                    <option value="route_segment" selected>Route Segment</option>
                    <option value="trusted_subdomain">Trusted Subdomain</option>
                    <option value="dedicated_internal_header">Dedicated Internal Header</option>
                  </select>
                </label>
                <label>Tenant Resolution Detail<input id="tenant-resolution-detail" value="Resolve tenant_id from /tenants/tenant_123/... request routes." required /></label>
              </div>
              <label>Tenant Membership Bootstrap<textarea id="tenant-membership-bootstrap" required>Grant tenant membership manually before enabling enforcement.</textarea></label>
              <div class="split">
                <button id="preview-manifest" type="button">Preview onboarding plan</button>
                <button id="apply-manifest" class="secondary" type="button">Apply onboarding manifest</button>
              </div>
            </form>
            <div id="onboarding-status" class="status"></div>
          </section>

          <section class="panel">
            <div class="eyebrow">Captured Mapping</div>
            <div id="mapping-summary" class="empty">Preview the onboarding plan to review the captured Supabase project and tenant-routing decisions.</div>
          </section>
        </div>

        <div class="stack">
          <section class="panel">
            <div class="eyebrow">Plan Summary</div>
            <div id="summary-grid" class="summary-grid"></div>
            <div id="manual-steps" class="empty">Manual mapping steps will appear after preview.</div>
          </section>

          <section class="panel">
            <div class="artifact-title">
              <div>
                <div class="eyebrow">Manifest Artifact</div>
                <h2>Starter manifest</h2>
              </div>
            </div>
            <pre id="manifest-output">Preview the onboarding plan to inspect the generated manifest.</pre>
          </section>

          <section class="panel">
            <div class="artifact-title">
              <div>
                <div class="eyebrow">Apply Result</div>
                <h2>Provisioning outcome</h2>
              </div>
            </div>
            <pre id="result-output">No preview or apply result yet.</pre>
          </section>
        </div>
      </section>
    </main>

    <script>
      const state = {
        latestManifest: null,
        latestResult: null,
      };

      const summaryRoot = document.getElementById('summary-grid');
      const mappingSummaryRoot = document.getElementById('mapping-summary');
      const manualStepsRoot = document.getElementById('manual-steps');
      const manifestOutput = document.getElementById('manifest-output');
      const resultOutput = document.getElementById('result-output');
      const statusRoot = document.getElementById('onboarding-status');
      const previewButton = document.getElementById('preview-manifest');
      const applyButton = document.getElementById('apply-manifest');

      const permissionSeeds = (slug, displayName) => ([
        {
          ref: 'read',
          action: 'read',
          resource_type: slug + '.record',
          description: 'Read ' + displayName + ' records',
        },
        {
          ref: 'write',
          action: 'write',
          resource_type: slug + '.record',
          description: 'Write ' + displayName + ' records',
        },
        {
          ref: 'approve',
          action: 'approve',
          resource_type: slug + '.record',
          description: 'Approve privileged ' + displayName + ' actions',
        },
      ]);

      const roleSeeds = (slug, displayName) => ([
        {
          name: slug + '-operator',
          description: 'Operational access for ' + displayName,
          approval_required: false,
          status: 'active',
          permission_refs: ['read', 'write'],
        },
        {
          name: slug + '-approver',
          description: 'Privileged approval access for ' + displayName,
          approval_required: true,
          status: 'active',
          permission_refs: ['read', 'approve'],
        },
      ]);

      const buildManifest = () => {
        const tenantId = document.getElementById('tenant-id').value.trim();
        const slug = document.getElementById('application-slug').value.trim();
        const displayName = document.getElementById('display-name').value.trim();

        return {
          tenant_id: tenantId,
          identity_bridge_mapping: {
            supabase_project_ref: document.getElementById('supabase-project-ref').value.trim(),
            expected_jwt_issuer: document.getElementById('supabase-jwt-issuer').value.trim(),
            expected_jwt_audience: document.getElementById('supabase-jwt-audience').value.trim(),
            tenant_resolution_rule: document.getElementById('tenant-resolution-rule').value,
            tenant_resolution_detail: document.getElementById('tenant-resolution-detail').value.trim(),
            tenant_membership_bootstrap: document.getElementById('tenant-membership-bootstrap').value.trim(),
          },
          application: {
            application_id: document.getElementById('application-id').value.trim(),
            slug,
            display_name: displayName,
          },
          permissions: permissionSeeds(slug, displayName),
          role_definitions: roleSeeds(slug, displayName),
          validation_checklist: [
            'Confirm the tenant_id matches the explicit tenant routing used by the consuming app.',
            'Verify the Supabase issuer and audience before protected requests rely on resolve-session.',
            'Keep approval_required enabled for privileged actions until the governance flow is exercised.',
            'Run resolve-session plus authorize.check in a non-production environment before tenant enforcement.',
          ],
        };
      };

      const renderSummary = (result) => {
        const cards = [
          [result.permissions.filter((entry) => entry.action === 'created').length, 'permissions created'],
          [result.role_definitions.filter((entry) => entry.action === 'created').length, 'roles created'],
          [result.role_permissions.filter((entry) => entry.action === 'attached').length, 'attachments created'],
        ];

        summaryRoot.innerHTML = cards.map(([value, label]) => (
          '<div class="summary-card"><strong>' + value + '</strong><span>' + label + '</span></div>'
        )).join('');
      };

      const renderMappingSummary = (manifest, result) => {
        const mapping = manifest.identity_bridge_mapping;
        mappingSummaryRoot.innerHTML = '<div class="artifact"><strong>' + mapping.supabase_project_ref + '</strong><div class="pill-row"><span class="pill">issuer ' + mapping.expected_jwt_issuer + '</span><span class="pill">audience ' + mapping.expected_jwt_audience + '</span><span class="pill">tenant rule ' + mapping.tenant_resolution_rule + '</span></div><p>' + mapping.tenant_resolution_detail + '</p><p>' + mapping.tenant_membership_bootstrap + '</p></div>';
        manualStepsRoot.innerHTML = '<ol class="step-list">' + result.identity_bridge_mapping.manual_steps.map((step) => '<li>' + step + '</li>').join('') + '</ol>';
      };

      const setBusy = (busy) => {
        previewButton.disabled = busy;
        applyButton.disabled = busy;
      };

      const submitManifest = async (dryRun) => {
        const manifest = buildManifest();
        state.latestManifest = manifest;
        manifestOutput.textContent = JSON.stringify(manifest, null, 2);
        statusRoot.textContent = dryRun ? 'Previewing onboarding manifest...' : 'Applying onboarding manifest...';
        setBusy(true);

        try {
          const response = await fetch(dryRun ? '/admin/onboarding/preview' : '/admin/onboarding/apply', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              actor_principal_id: document.getElementById('actor-principal-id').value.trim() || null,
              actor_subject: document.getElementById('actor-subject').value.trim(),
              reason: document.getElementById('reason').value.trim(),
              manifest,
            }),
          });

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.message || 'Admin onboarding request failed.');
          }

          state.latestResult = payload;
          renderSummary(payload);
          renderMappingSummary(manifest, payload);
          resultOutput.textContent = JSON.stringify(payload, null, 2);
          statusRoot.textContent = dryRun ? 'Preview ready. Review mapping and planned provisioning before apply.' : 'Onboarding manifest applied. Review the mapping follow-up steps before enabling enforcement.';
        } catch (error) {
          statusRoot.textContent = error instanceof Error ? error.message : 'Admin onboarding request failed.';
        } finally {
          setBusy(false);
        }
      };

      previewButton.addEventListener('click', () => {
        void submitManifest(true);
      });

      applyButton.addEventListener('click', () => {
        void submitManifest(false);
      });
    </script>
  </body>
</html>`;