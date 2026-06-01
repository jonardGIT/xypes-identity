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

      .status.warn { color: var(--warn); }

      .guardrail {
        border: 1px solid rgba(140, 90, 29, 0.2);
        border-radius: 18px;
        background: rgba(191, 122, 41, 0.08);
        padding: 14px;
      }

      .guardrail p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
        font-size: 0.84rem;
      }

      .checklist {
        display: grid;
        gap: 10px;
      }

      .checklist label {
        grid-template-columns: auto 1fr;
        align-items: start;
        text-transform: none;
        letter-spacing: 0;
        font-size: 0.82rem;
      }

      .checklist input {
        width: 16px;
        height: 16px;
        margin-top: 2px;
        padding: 0;
      }

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
              <div class="guardrail">
                <div class="eyebrow">Apply Guardrails</div>
                <div class="checklist">
                  <label><input id="confirm-preview-reviewed" type="checkbox" />I reviewed the generated manifest preview and the captured Supabase and tenant-routing mapping.</label>
                  <label><input id="confirm-manual-steps-reviewed" type="checkbox" />I reviewed the manual follow-up steps and will not enable enforcement until non-production validation passes.</label>
                </div>
              </div>
              <div class="split">
                <button id="preview-manifest" type="button">Preview onboarding plan</button>
                <button id="apply-manifest" class="secondary" type="button" disabled>Apply onboarding manifest</button>
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
            <div id="preview-rail" class="artifact">Run a preview to unlock apply. Any manifest change requires a fresh preview review.</div>
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
        busy: false,
        latestManifest: null,
        latestResult: null,
        latestPreviewSignature: null,
        latestPreviewAt: null,
      };

      const onboardingForm = document.getElementById('onboarding-form');
      const summaryRoot = document.getElementById('summary-grid');
      const mappingSummaryRoot = document.getElementById('mapping-summary');
      const manualStepsRoot = document.getElementById('manual-steps');
      const manifestOutput = document.getElementById('manifest-output');
      const previewRailRoot = document.getElementById('preview-rail');
      const resultOutput = document.getElementById('result-output');
      const statusRoot = document.getElementById('onboarding-status');
      const previewButton = document.getElementById('preview-manifest');
      const applyButton = document.getElementById('apply-manifest');
      const confirmationIds = ['confirm-preview-reviewed', 'confirm-manual-steps-reviewed'];

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

      const escapeHtml = (value) => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

      const serializeManifest = (manifest) => JSON.stringify(manifest);

      const allConfirmationsChecked = () => confirmationIds.every((id) => document.getElementById(id).checked);

      const currentPreviewMatchesForm = () => {
        if (state.latestPreviewSignature === null) {
          return false;
        }

        return state.latestPreviewSignature === serializeManifest(buildManifest());
      };

      const setStatus = (message, tone) => {
        statusRoot.textContent = message;
        statusRoot.className = tone === 'warn' ? 'status warn' : 'status';
      };

      const renderPreviewRail = () => {
        const previewReady = currentPreviewMatchesForm();
        const confirmationsReady = allConfirmationsChecked();
        const reviewedAt = state.latestPreviewAt === null ? 'not yet captured' : new Date(state.latestPreviewAt).toLocaleString();
        const stateLabel = previewReady
          ? (confirmationsReady ? 'Apply unlocked' : 'Preview reviewed, waiting for confirmations')
          : 'Preview required';

        previewRailRoot.innerHTML = '<strong>' + escapeHtml(stateLabel) + '</strong><div class="pill-row"><span class="pill">preview reviewed ' + escapeHtml(reviewedAt) + '</span><span class="pill">manifest ' + escapeHtml(previewReady ? 'in sync with preview' : 'changed since preview') + '</span><span class="pill">confirmations ' + escapeHtml(confirmationsReady ? 'complete' : 'pending') + '</span></div><p>' + escapeHtml(previewReady ? 'Apply is only enabled while the current form exactly matches the reviewed preview.' : 'Rerun preview after any edit so the operator reviews the exact manifest that will be applied.') + '</p>';
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
        mappingSummaryRoot.innerHTML = '<div class="artifact"><strong>' + escapeHtml(mapping.supabase_project_ref) + '</strong><div class="pill-row"><span class="pill">issuer ' + escapeHtml(mapping.expected_jwt_issuer) + '</span><span class="pill">audience ' + escapeHtml(mapping.expected_jwt_audience) + '</span><span class="pill">tenant rule ' + escapeHtml(mapping.tenant_resolution_rule) + '</span></div><p>' + escapeHtml(mapping.tenant_resolution_detail) + '</p><p>' + escapeHtml(mapping.tenant_membership_bootstrap) + '</p></div>';
        manualStepsRoot.innerHTML = '<ol class="step-list">' + result.identity_bridge_mapping.manual_steps.map((step) => '<li>' + escapeHtml(step) + '</li>').join('') + '</ol>';
      };

      const setBusy = (busy) => {
        state.busy = busy;
        previewButton.disabled = busy;
        updateApplyState();
      };

      const updateApplyState = () => {
        const previewReady = currentPreviewMatchesForm();
        applyButton.disabled = state.busy || !previewReady || !allConfirmationsChecked();
        renderPreviewRail();
      };

      const resetConfirmations = () => {
        confirmationIds.forEach((id) => {
          document.getElementById(id).checked = false;
        });
      };

      const markPreviewStaleIfNeeded = () => {
        if (state.latestPreviewSignature === null) {
          updateApplyState();
          return;
        }

        if (currentPreviewMatchesForm()) {
          updateApplyState();
          return;
        }

        state.latestPreviewSignature = null;
        state.latestPreviewAt = null;
        setStatus('Manifest inputs changed after preview. Run preview again before apply.', 'warn');
        updateApplyState();
      };

      const submitManifest = async (dryRun) => {
        const manifest = buildManifest();
        const manifestSignature = serializeManifest(manifest);

        if (!dryRun) {
          if (state.latestPreviewSignature !== manifestSignature) {
            setStatus('Run preview on the current manifest before apply.', 'warn');
            updateApplyState();
            return;
          }

          if (!allConfirmationsChecked()) {
            setStatus('Complete both apply guardrails before applying the manifest.', 'warn');
            updateApplyState();
            return;
          }
        }

        state.latestManifest = manifest;
        manifestOutput.textContent = JSON.stringify(manifest, null, 2);
        setStatus(dryRun ? 'Previewing onboarding manifest...' : 'Applying onboarding manifest...');
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
          if (dryRun) {
            state.latestPreviewSignature = manifestSignature;
            state.latestPreviewAt = new Date().toISOString();
            resetConfirmations();
          } else {
            state.latestPreviewSignature = null;
            state.latestPreviewAt = null;
            resetConfirmations();
          }
          renderSummary(payload);
          renderMappingSummary(manifest, payload);
          resultOutput.textContent = JSON.stringify(payload, null, 2);
          setStatus(dryRun ? 'Preview ready. Review mapping, manual steps, and apply guardrails before apply.' : 'Onboarding manifest applied. Run a fresh preview before any follow-up apply and finish the manual mapping steps before enabling enforcement.');
        } catch (error) {
          setStatus(error instanceof Error ? error.message : 'Admin onboarding request failed.', 'warn');
        } finally {
          setBusy(false);
        }
      };

      onboardingForm.addEventListener('input', () => {
        markPreviewStaleIfNeeded();
      });

      onboardingForm.addEventListener('change', () => {
        updateApplyState();
      });

      previewButton.addEventListener('click', () => {
        void submitManifest(true);
      });

      applyButton.addEventListener('click', () => {
        void submitManifest(false);
      });

      updateApplyState();
    </script>
  </body>
</html>`;
