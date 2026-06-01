export const renderAccessReviewConsole = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>xypes-identity admin review console</title>
    <style>
      :root {
        --bg: #f3efe5;
        --panel: rgba(255, 252, 246, 0.92);
        --panel-strong: #fffaf0;
        --ink: #1d2a2a;
        --muted: #5a6967;
        --accent: #9d3c2b;
        --accent-soft: rgba(157, 60, 43, 0.12);
        --line: rgba(29, 42, 42, 0.12);
        --warn: #8b5e00;
        --shadow: 0 20px 60px rgba(42, 31, 18, 0.12);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(157, 60, 43, 0.18), transparent 30%),
          radial-gradient(circle at right 20%, rgba(30, 107, 82, 0.14), transparent 25%),
          linear-gradient(180deg, #faf7f0 0%, var(--bg) 100%);
        color: var(--ink);
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      }

      main {
        width: min(1180px, calc(100% - 32px));
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

      .eyebrow {
        margin: 0 0 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
        font: 600 12px/1.4 "IBM Plex Mono", "Cascadia Mono", Consolas, monospace;
      }

      h1, h2, h3 { margin: 0; font-weight: 600; }
      h1 { font-size: clamp(2.1rem, 5vw, 3.6rem); line-height: 0.95; max-width: 11ch; }

      .hero p,
      .meta,
      label,
      input,
      button,
      textarea,
      .pill,
      .summary-card,
      .candidate,
      .finding,
      pre { font-family: "IBM Plex Mono", "Cascadia Mono", Consolas, monospace; }

      .hero-copy {
        display: grid;
        gap: 14px;
        grid-template-columns: 1.2fr 0.8fr;
        align-items: end;
      }

      .hero p { margin: 0; color: var(--muted); font-size: 0.95rem; line-height: 1.6; }
      .grid { display: grid; gap: 20px; grid-template-columns: minmax(320px, 380px) minmax(0, 1fr); }
      .panel { padding: 20px; }
      .stack { display: grid; gap: 16px; }
      form { display: grid; gap: 14px; }
      .row { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }

      label {
        display: grid;
        gap: 8px;
        color: var(--muted);
        font-size: 0.77rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      input, textarea {
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
        background: linear-gradient(135deg, #1d2a2a, #35554a);
        color: white;
        cursor: pointer;
        font-size: 0.9rem;
      }

      button.secondary { background: linear-gradient(135deg, #9d3c2b, #c8653d); }
      button.tertiary {
        background: transparent;
        color: var(--ink);
        border: 1px solid var(--line);
      }
      button:disabled { opacity: 0.6; cursor: progress; }
      .status { min-height: 20px; color: var(--muted); font-size: 0.82rem; }
      .summary-grid, .candidate-grid, .section-grid { display: grid; gap: 12px; }
      .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 18px; }

      .summary-card, .candidate, .finding {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.72);
        padding: 14px;
      }

      .summary-card strong { display: block; font-size: 1.6rem; margin-bottom: 6px; }
      .summary-card span, .meta, .pill { color: var(--muted); font-size: 0.8rem; }

      .section-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: baseline;
        margin-bottom: 10px;
      }

      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; }
      .pill { border-radius: 999px; padding: 6px 10px; background: var(--accent-soft); }
      .candidate { border-left: 4px solid var(--accent); }
      .candidate.selected {
        border-left-color: #35554a;
        box-shadow: inset 0 0 0 1px rgba(53, 85, 74, 0.2);
      }
      .candidate-actions {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-top: 12px;
      }
      .selection-card {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.72);
        padding: 14px;
      }
      .selection-card strong {
        display: block;
        margin-bottom: 8px;
        font-family: "IBM Plex Mono", "Cascadia Mono", Consolas, monospace;
      }
      .confirm-label {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        text-transform: none;
        letter-spacing: 0;
        font-size: 0.85rem;
      }
      .confirm-label input {
        width: auto;
        margin-top: 2px;
      }
      .finding.high { border-left: 4px solid var(--accent); }
      .finding.medium { border-left: 4px solid var(--warn); }
      pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.8rem; color: var(--ink); }
      .empty { border: 1px dashed var(--line); border-radius: 18px; padding: 18px; color: var(--muted); }

      @media (max-width: 920px) {
        .hero-copy, .grid, .row, .summary-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">xypes-identity admin</div>
        <div class="hero-copy">
          <div><h1>Governance review console</h1></div>
          <p>
            This console sits on top of the admin API. It reads the access review workbench,
            activates approval-required eligible bindings through the existing status endpoint,
            and queries audit evidence without adding local authorization logic.
          </p>
        </div>
      </section>

      <section class="grid">
        <div class="stack">
          <section class="panel">
            <div class="eyebrow">Review Query</div>
            <form id="review-form">
              <label>Tenant Id<input id="tenant-id" value="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1" required /></label>
              <div class="row">
                <label>Stale After Days<input id="stale-after-days" type="number" min="1" value="30" required /></label>
                <label>Limit<input id="limit" type="number" min="1" max="500" value="25" /></label>
              </div>
              <label>Finding Codes (comma separated)<input id="finding-codes" value="PRIVILEGED_ROLE_BINDING,STALE_ROLE_BINDING" /></label>
              <button id="load-review" type="submit">Load workbench</button>
            </form>
            <div id="review-status" class="status"></div>
          </section>

          <section class="panel">
            <div class="eyebrow">Approval Activation</div>
            <form id="activation-form">
              <label>Role Binding Id<input id="role-binding-id" placeholder="binding_123" required /></label>
              <div id="selected-candidate" class="empty">Select a candidate from the workbench before activating privileged access.</div>
              <div class="row">
                <label>Actor Principal Id<input id="actor-principal-id" placeholder="principal_approver" /></label>
                <label>Actor Subject<input id="actor-subject" value="approver@example.com" required /></label>
              </div>
              <label>Reason<textarea id="activation-reason" required>Approval completed</textarea></label>
              <label class="confirm-label"><input id="activation-confirmation" type="checkbox" required />I confirm this privileged action should move the selected binding from eligible to active.</label>
              <button id="activate-binding" class="secondary" type="submit">Activate selected binding</button>
            </form>
            <div id="activation-status" class="status"></div>
          </section>

          <section class="panel">
            <div class="eyebrow">Audit Evidence</div>
            <div id="audit-event-id" class="status">Latest audit event id: pending</div>
            <pre id="audit-output">Load the workbench or activate a binding to query audit evidence.</pre>
          </section>
        </div>

        <section class="panel">
          <div class="eyebrow">Workbench</div>
          <div id="workbench-summary" class="summary-grid"></div>
          <div id="approval-candidates" class="candidate-grid"></div>
          <div id="workbench-sections" class="section-grid"></div>
        </section>
      </section>
    </main>

    <script>
      const state = {
        latestTenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        latestRoleBindingId: null,
        latestCandidates: [],
        selectedCandidate: null,
        latestAuditEventId: null,
      };
      const reviewForm = document.getElementById('review-form');
      const activationForm = document.getElementById('activation-form');
      const reviewStatus = document.getElementById('review-status');
      const activationStatus = document.getElementById('activation-status');
      const summaryRoot = document.getElementById('workbench-summary');
      const candidatesRoot = document.getElementById('approval-candidates');
      const sectionsRoot = document.getElementById('workbench-sections');
      const auditOutput = document.getElementById('audit-output');
      const auditEventId = document.getElementById('audit-event-id');
      const loadButton = document.getElementById('load-review');
      const activateButton = document.getElementById('activate-binding');
      const roleBindingInput = document.getElementById('role-binding-id');
      const selectedCandidateRoot = document.getElementById('selected-candidate');
      const activationConfirmationInput = document.getElementById('activation-confirmation');

      const setStatus = (element, message, isError) => {
        element.textContent = message;
        element.style.color = isError ? 'var(--accent)' : 'var(--muted)';
      };

      const toCodes = (rawValue) => rawValue.split(',').map((value) => value.trim()).filter(Boolean);

      const setLatestAuditEventId = (value) => {
        state.latestAuditEventId = value;
        auditEventId.textContent = value
          ? 'Latest audit event id: ' + value
          : 'Latest audit event id: pending';
      };

      const describeScope = (candidate) => {
        if (!candidate || !candidate.scope_type) {
          return 'none';
        }
        if (candidate.scope_type === 'application') {
          return 'application ' + (candidate.scope_application_id || 'unknown');
        }
        if (candidate.scope_type === 'resource') {
          return 'resource ' + (candidate.scope_resource_type || 'unknown') + ':' + (candidate.scope_resource_id || 'unknown');
        }
        return candidate.scope_type;
      };

      const renderSelectedCandidate = () => {
        if (!state.selectedCandidate) {
          selectedCandidateRoot.className = 'empty';
          selectedCandidateRoot.textContent = 'Select a candidate from the workbench before activating privileged access.';
          return;
        }
        selectedCandidateRoot.className = 'selection-card';
        selectedCandidateRoot.innerHTML = '<strong>Selected approval target</strong><div class="meta">Binding ' + state.selectedCandidate.entity_id + '</div><div class="pill-row"><span class="pill">role ' + (state.selectedCandidate.role_definition_name || 'unknown') + '</span><span class="pill">subject ' + (state.selectedCandidate.subject_principal_id || state.selectedCandidate.subject_group_id || 'unassigned') + '</span><span class="pill">scope ' + describeScope(state.selectedCandidate) + '</span></div><p>' + state.selectedCandidate.detail + '</p>';
      };

      const selectCandidate = (candidateId) => {
        state.selectedCandidate = state.latestCandidates.find((candidate) => candidate.entity_id === candidateId) || null;
        state.latestRoleBindingId = candidateId;
        roleBindingInput.value = candidateId;
        renderSelectedCandidate();
        renderCandidates(state.latestCandidates);
        setStatus(activationStatus, 'Selected binding ' + candidateId + '. Review the reason and confirm activation before submitting.', false);
      };

      const requestJson = async (path, body, method = 'POST') => {
        const response = await fetch(path, {
          method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || payload.error || 'Request failed');
        }
        return payload;
      };

      const renderSummary = (summary) => {
        const cards = [
          [summary.total_findings, 'total findings'],
          [summary.approval_activation_candidates, 'activation candidates'],
          [summary.high_severity_count, 'high severity'],
          [summary.medium_severity_count, 'medium severity'],
          [summary.approval_required_findings, 'approval required'],
          [summary.counts_by_code.map((entry) => entry.code + ': ' + entry.total).join(' | '), 'counts by code'],
        ];
        summaryRoot.innerHTML = cards.map(([value, label]) => '<article class="summary-card"><strong>' + value + '</strong><span>' + label + '</span></article>').join('');
      };

      const renderCandidates = (candidates) => {
        if (candidates.length === 0) {
          candidatesRoot.innerHTML = '<div class="empty">No approval activation candidates are currently eligible.</div>';
          return;
        }
        candidatesRoot.innerHTML = candidates.map((candidate) => {
          const isSelected = state.selectedCandidate && state.selectedCandidate.entity_id === candidate.entity_id;
          return '<article class="candidate ' + (isSelected ? 'selected' : '') + '"><div class="section-header"><h3>' + candidate.title + '</h3><span class="pill">' + candidate.entity_id + '</span></div><div class="meta">Observed ' + candidate.observed_at + '</div><p>' + candidate.detail + '</p><div class="pill-row"><span class="pill">role ' + (candidate.role_definition_name || 'unknown') + '</span><span class="pill">subject ' + (candidate.subject_principal_id || candidate.subject_group_id || 'unassigned') + '</span><span class="pill">scope ' + describeScope(candidate) + '</span></div><div class="candidate-actions"><span class="meta">Explicit selection is required before activation.</span><button class="tertiary" type="button" data-candidate-id="' + candidate.entity_id + '" ' + (isSelected ? 'disabled' : '') + '>' + (isSelected ? 'Selected' : 'Select candidate') + '</button></div></article>';
        }).join('');
        candidatesRoot.querySelectorAll('[data-candidate-id]').forEach((button) => {
          button.addEventListener('click', () => {
            const candidateId = button.getAttribute('data-candidate-id');
            if (candidateId) {
              selectCandidate(candidateId);
            }
          });
        });
      };

      const renderSections = (sections) => {
        sectionsRoot.innerHTML = sections.map((section) => {
          const findingsMarkup = section.findings.length === 0
            ? '<div class="empty">No findings in this section.</div>'
            : section.findings.map((finding) => '<article class="finding ' + finding.severity + '"><div class="section-header"><h3>' + finding.title + '</h3><span class="pill">' + finding.code + '</span></div><div class="meta">' + finding.entity_type + ' ' + finding.entity_id + '</div><p>' + finding.detail + '</p><div class="pill-row"><span class="pill">severity ' + finding.severity + '</span><span class="pill">status ' + (finding.role_binding_status || 'n/a') + '</span><span class="pill">role ' + (finding.role_definition_name || 'unknown') + '</span></div></article>').join('');
          return '<section><div class="section-header"><h2>' + section.title + '</h2><span class="pill">' + section.total_findings + ' findings</span></div>' + findingsMarkup + '</section>';
        }).join('');
      };

      const loadAudit = async (tenantId, roleBindingId) => {
        if (!roleBindingId) {
          setLatestAuditEventId(null);
          auditOutput.textContent = 'No role binding selected yet.';
          return;
        }
        const payload = await requestJson('/admin/audit-events/query', {
          tenant_id: tenantId,
          event_types: ['role_binding.status_updated'],
          entity_type: 'role_binding',
          entity_id: roleBindingId,
          limit: 10,
        });
        const latestEvent = Array.isArray(payload.events)
          ? payload.events.reduce((currentLatest, event) => {
              if (!currentLatest) {
                return event;
              }
              return Date.parse(event.occurred_at) > Date.parse(currentLatest.occurred_at)
                ? event
                : currentLatest;
            }, null)
          : null;
        setLatestAuditEventId(latestEvent ? latestEvent.audit_event_id : null);
        auditOutput.textContent = JSON.stringify(payload, null, 2);
      };

      const loadWorkbench = async (preserveSelection = false) => {
        const tenantId = document.getElementById('tenant-id').value.trim();
        const response = await requestJson('/admin/access-reviews/workbench', {
          tenant_id: tenantId,
          stale_after_days: Number(document.getElementById('stale-after-days').value),
          limit: Number(document.getElementById('limit').value),
          finding_codes: toCodes(document.getElementById('finding-codes').value),
        });
        state.latestTenantId = tenantId;
        state.latestCandidates = response.approval_activation_candidates;
        state.selectedCandidate = preserveSelection
          ? response.approval_activation_candidates.find((candidate) => candidate.entity_id === state.latestRoleBindingId) || null
          : null;
        renderSummary(response.summary);
        renderCandidates(response.approval_activation_candidates);
        renderSections(response.sections);
        renderSelectedCandidate();
        await loadAudit(state.latestTenantId, state.latestRoleBindingId || roleBindingInput.value.trim());
      };

      reviewForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loadButton.disabled = true;
        setStatus(reviewStatus, 'Loading access review workbench...', false);
        try {
          state.latestRoleBindingId = roleBindingInput.value.trim() || null;
          await loadWorkbench(true);
          setStatus(reviewStatus, 'Workbench refreshed from /admin/access-reviews/workbench.', false);
        } catch (error) {
          setStatus(reviewStatus, error.message, true);
        } finally {
          loadButton.disabled = false;
        }
      });

      activationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        activateButton.disabled = true;
        setStatus(activationStatus, 'Activating eligible binding...', false);
        try {
          const tenantId = document.getElementById('tenant-id').value.trim();
          const roleBindingId = roleBindingInput.value.trim();
          if (!roleBindingId) {
            throw new Error('Select an approval candidate or enter a role binding id before activation.');
          }
          if (!activationConfirmationInput.checked) {
            throw new Error('Confirm activation before submitting this privileged action.');
          }
          state.latestTenantId = tenantId;
          state.latestRoleBindingId = roleBindingId;
          await requestJson('/admin/role-bindings/' + encodeURIComponent(roleBindingId) + '/status', {
            tenant_id: tenantId,
            role_binding_status: 'active',
            actor_principal_id: document.getElementById('actor-principal-id').value.trim() || null,
            actor_subject: document.getElementById('actor-subject').value.trim(),
            reason: document.getElementById('activation-reason').value.trim(),
          }, 'PATCH');
          activationConfirmationInput.checked = false;
          state.selectedCandidate = null;
          await loadWorkbench(false);
          setStatus(
            activationStatus,
            state.latestAuditEventId
              ? 'Binding activated. Latest audit event id: ' + state.latestAuditEventId
              : 'Binding activated. Latest audit event id is pending.',
            false,
          );
        } catch (error) {
          setStatus(activationStatus, error.message, true);
        } finally {
          activateButton.disabled = false;
        }
      });

      renderSelectedCandidate();
    </script>
  </body>
</html>`;
