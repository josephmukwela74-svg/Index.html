// JMK CANARY - Application Logic
// Uses localStorage for persistence of inspections and checklist state

(function () {
  'use strict';

  // --- Data ---
  var DEFAULT_INSPECTIONS = [
    { ref: 'JMK-2026-001', client: 'Kafue Freight Ltd', type: 'Vehicle Roadworthiness', date: '2026-09-15', status: 'pass' },
    { ref: 'JMK-2026-002', client: 'Ndola Copper Works', type: 'Workplace OHS Audit', date: '2026-09-18', status: 'pending' },
    { ref: 'JMK-2026-003', client: 'Lusaka Logistics Co', type: 'Vehicle Roadworthiness', date: '2026-09-22', status: 'fail' },
    { ref: 'JMK-2026-004', client: 'Kitwe Construction', type: 'PPE Assessment', date: '2026-09-25', status: 'pass' }
  ];

  var CHECKLIST_ITEMS = [
    { q: 'Fire extinguishers installed and serviced', d: 'Accessible, within service date, correct type for hazard' },
    { q: 'Emergency exits clearly marked and unobstructed', d: 'Signage visible, exits unlocked during working hours' },
    { q: 'First aid kits stocked and accessible', d: 'Contents within expiry, designated first aiders trained' },
    { q: 'PPE provided to all workers at risk', d: 'Helmets, gloves, boots, eye/ear protection as required' },
    { q: 'Electrical installations certified', d: 'Current electrical certificate of compliance on file' },
    { q: 'Hazardous chemicals properly stored and labelled', d: 'MSDS available, storage complies with regulations' },
    { q: 'Safety signage displayed in relevant areas', d: 'Warning, mandatory, and prohibition signs as needed' },
    { q: 'Incident register maintained', d: 'All incidents recorded, investigated, and reported' },
    { q: 'Workers trained in emergency procedures', d: 'Fire drills conducted at least annually' },
    { q: 'Workplace inspected for hazards regularly', d: 'Documented routine safety inspections' }
  ];

  // --- ISO 45001 Clause Data ---
  var ISO_CLAUSES = [
    { tab: '4. Context', questions: [
      { q: 'External & internal issues affecting OH&S identified', d: 'Clause 4.1 — Understand the context of your organisation' },
      { q: 'Needs of workers and interested parties determined', d: 'Clause 4.2 — Identify stakeholder requirements' },
      { q: 'Scope of the OH&S management system defined', d: 'Clause 4.3 — Document system boundaries and applicability' },
      { q: 'OH&S management system established and maintained', d: 'Clause 4.4 — Processes needed for the system are in place' }
    ]},
    { tab: '5. Leadership', questions: [
      { q: 'Top management demonstrates leadership & commitment', d: 'Clause 5.1 — Leaders take accountability for OH&S' },
      { q: 'OH&S policy established and communicated', d: 'Clause 5.2 — Policy is documented, posted, and understood' },
      { q: 'Roles, responsibilities & authorities assigned', d: 'Clause 5.3 — Clear organisational structure for OH&S' },
      { q: 'Worker consultation & participation ensured', d: 'Clause 5.4 — Workers involved in OH&S decision-making' }
    ]},
    { tab: '6. Planning', questions: [
      { q: 'Hazards identified and OH&S risks assessed', d: 'Clause 6.1.2 — Systematic hazard identification process' },
      { q: 'OH&S objectives and targets set', d: 'Clause 6.2 — Measurable goals with action plans' },
      { q: 'Change management process in place', d: 'Clause 6.1.3 — Planned changes assessed for OH&S impact' },
      { q: 'Legal and other requirements determined', d: 'Clause 6.1.3 — Applicable laws and standards identified' }
    ]},
    { tab: '7. Support', questions: [
      { q: 'Adequate resources provided for OH&S', d: 'Clause 7.1 — People, infrastructure, and financial resources' },
      { q: 'Workers competent and trained for OH&S tasks', d: 'Clause 7.2 — Training needs identified and delivered' },
      { q: 'OH&S information communicated effectively', d: 'Clause 7.4 — Internal and external communication processes' },
      { q: 'Documented information controlled and maintained', d: 'Clause 7.5 — Documents current, accessible, and version-controlled' }
    ]},
    { tab: '8. Operation', questions: [
      { q: 'Operational controls for hazards in place', d: 'Clause 8.1 — Controls to manage OH&S risks implemented' },
      { q: 'Emergency preparedness and response planned', d: 'Clause 8.2 — Emergency procedures tested and maintained' },
      { q: 'Procurement and contractor OH&S managed', d: 'Clause 8.1.4 — Contractors assessed for OH&S compliance' },
      { q: 'Design controls address OH&S in new processes', d: 'Clause 8.1.3 — Safety-by-design for new facilities/equipment' }
    ]},
    { tab: '9. Evaluation', questions: [
      { q: 'OH&S performance monitored and measured', d: 'Clause 9.1 — Leading and lagging indicators tracked' },
      { q: 'Compliance obligations evaluated', d: 'Clause 9.1.2 — Periodic compliance audits conducted' },
      { q: 'Internal audits conducted periodically', d: 'Clause 9.2 — Audit programme covers all system elements' },
      { q: 'Management review held at planned intervals', d: 'Clause 9.3 — Top management reviews system effectiveness' }
    ]},
    { tab: '10. Improvement', questions: [
      { q: 'Incidents, nonconformities & corrective actions managed', d: 'Clause 10.1 — Root cause analysis and corrective actions' },
      { q: 'Continual improvement of OH&S system', d: 'Clause 10.2 — Systematic improvement actions implemented' },
      { q: 'Lessons learned shared across organisation', d: 'Clause 10.1 — Knowledge from incidents shared organisation-wide' }
    ]}
  ];

  // --- Risk Matrix Data ---
  var LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  var SEVERITY_LABELS = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

  function riskLevel(score) {
    if (score <= 4) return { cls: 'risk-low', label: 'Low' };
    if (score <= 9) return { cls: 'risk-medium', label: 'Medium' };
    if (score <= 14) return { cls: 'risk-high', label: 'High' };
    return { cls: 'risk-extreme', label: 'Extreme' };
  }

  var STORAGE_KEY = 'jmk_canary_data';

  // --- State ---
  var state = loadState();

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.inspections) return saved;
    } catch (e) {}
    return { inspections: DEFAULT_INSPECTIONS.slice(), checklist: {}, iso: {}, hazards: [] };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // --- Helpers ---
  function nextRef() {
    var max = 0;
    state.inspections.forEach(function (i) {
      var n = parseInt(i.ref.split('-').pop(), 10);
      if (n > max) max = n;
    });
    return 'JMK-2026-' + String(max + 1).padStart(3, '0');
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function statusLabel(s) {
    return s === 'pass' ? 'Passed' : s === 'fail' ? 'Failed' : 'Pending';
  }

  // --- Stats ---
  function renderStats() {
    var total = state.inspections.length;
    var pass = state.inspections.filter(function (i) { return i.status === 'pass'; }).length;
    var fail = state.inspections.filter(function (i) { return i.status === 'fail'; }).length;
    var pending = state.inspections.filter(function (i) { return i.status === 'pending'; }).length;
    var rate = total > 0 ? Math.round((pass / total) * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pass').textContent = pass;
    document.getElementById('stat-fail').textContent = fail;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-rate').textContent = rate + '%';
  }

  // --- Inspections Table ---
  function renderInspections() {
    var search = (document.getElementById('search-input').value || '').toLowerCase();
    var filter = document.getElementById('filter-status').value;

    var filtered = state.inspections.filter(function (i) {
      var matchesSearch = !search ||
        i.client.toLowerCase().indexOf(search) !== -1 ||
        i.ref.toLowerCase().indexOf(search) !== -1;
      var matchesFilter = !filter || i.status === filter;
      return matchesSearch && matchesFilter;
    });

    var tbody = document.getElementById('inspections-body');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">No inspections found</td></tr>';
      return;
    }

    filtered.forEach(function (i) {
      var tr = document.createElement('tr');
      var certCell = i.status === 'pass'
        ? '<button class="cert-btn" onclick="viewCertificate(\'' + i.ref + '\')">View Certificate</button>'
        : '';
      tr.innerHTML =
        '<td>' + i.ref + '</td>' +
        '<td>' + i.client + '</td>' +
        '<td>' + i.type + '</td>' +
        '<td>' + formatDate(i.date) + '</td>' +
        '<td><span class="status ' + i.status + '">' + statusLabel(i.status) + '</span></td>' +
        '<td>' + certCell + '</td>';
      tbody.appendChild(tr);
    });
  }

  // --- Add Inspection ---
  window.openAddModal = function () {
    document.getElementById('add-modal').classList.add('active');
  };

  window.closeAddModal = function () {
    document.getElementById('add-modal').classList.remove('active');
    document.getElementById('add-form').reset();
  };

  document.getElementById('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var newInsp = {
      ref: nextRef(),
      client: document.getElementById('add-client').value.trim(),
      type: document.getElementById('add-type').value,
      date: document.getElementById('add-date').value,
      status: document.getElementById('add-status').value
    };
    state.inspections.push(newInsp);
    saveState();
    closeAddModal();
    renderAll();
  });

  // --- Certificate ---
  window.viewCertificate = function (ref) {
    var insp = state.inspections.filter(function (i) { return i.ref === ref; })[0];
    if (!insp) return;

    var html =
      '<div class="certificate">' +
        '<div class="seal">🏅</div>' +
        '<h2>Certificate of Compliance</h2>' +
        '<div class="sub">JMK CANARY — OHS Inspections &amp; Vehicle Compliance Zambia</div>' +
        '<div class="field">This is to certify that</div>' +
        '<div class="field"><strong style="font-size:1.2rem">' + insp.client + '</strong></div>' +
        '<div class="field">has successfully passed the</div>' +
        '<div class="field"><strong>' + insp.type + '</strong> inspection</div>' +
        '<div class="field">conducted on <strong>' + formatDate(insp.date) + '</strong></div>' +
        '<div class="field" style="margin-top:15px">Inspector: JMK CANARY Certified Inspector</div>' +
        '<div class="cert-num">Certificate Reference: ' + insp.ref + '</div>' +
      '</div>' +
      '<div style="text-align:center;margin-top:20px">' +
        '<button class="btn" onclick="window.print()">Print Certificate</button>' +
      '</div>';

    document.getElementById('cert-content').innerHTML = html;
    document.getElementById('cert-modal').classList.add('active');
  };

  window.closeCertModal = function () {
    document.getElementById('cert-modal').classList.remove('active');
  };

  // --- Checklist ---
  function renderChecklist() {
    var container = document.getElementById('checklist-items');
    container.innerHTML = '';

    CHECKLIST_ITEMS.forEach(function (item, idx) {
      var div = document.createElement('div');
      div.className = 'checklist-item';
      var checked = state.checklist[idx] ? 'checked' : '';
      div.innerHTML =
        '<input type="checkbox" id="chk-' + idx + '" ' + checked + ' onchange="toggleChecklist(' + idx + ')">' +
        '<label class="text" for="chk-' + idx + '">' +
          '<strong>' + item.q + '</strong>' +
          '<small>' + item.d + '</small>' +
        '</label>';
      container.appendChild(div);
    });

    updateChecklistScore();
  }

  window.toggleChecklist = function (idx) {
    state.checklist[idx] = document.getElementById('chk-' + idx).checked;
    saveState();
    updateChecklistScore();
  };

  function updateChecklistScore() {
    var checked = Object.keys(state.checklist).filter(function (k) { return state.checklist[k]; }).length;
    var total = CHECKLIST_ITEMS.length;
    var pct = Math.round((checked / total) * 100);

    document.getElementById('checklist-progress').style.width = pct + '%';
    document.getElementById('checklist-score').textContent = checked + ' / ' + total;

    var verdict = document.getElementById('checklist-verdict');
    if (pct >= 80) {
      verdict.textContent = 'Compliant — Well done!';
      verdict.style.background = '#d4edda';
      verdict.style.color = '#155724';
    } else if (pct >= 50) {
      verdict.textContent = 'Partially compliant — Action needed';
      verdict.style.background = '#fff3cd';
      verdict.style.color = '#856404';
    } else if (pct > 0) {
      verdict.textContent = 'Non-compliant — Urgent action required';
      verdict.style.background = '#f8d7da';
      verdict.style.color = '#721c24';
    } else {
      verdict.textContent = 'Not assessed';
      verdict.style.background = '#e8e8e8';
      verdict.style.color = '#666';
    }
  }

  // --- Booking Form ---
  document.getElementById('booking-form').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Thank you! JMK CANARY will contact you shortly to confirm your inspection.');
    e.target.reset();
  });

  // --- Search & Filter ---
  document.getElementById('search-input').addEventListener('input', renderInspections);
  document.getElementById('filter-status').addEventListener('change', renderInspections);

  // --- Close modals on overlay click ---
  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // --- ISO 45001 Assessment ---
  function renderIsoTabs() {
    var tabContainer = document.getElementById('iso-tabs');
    tabContainer.innerHTML = '';
    ISO_CLAUSES.forEach(function (clause, idx) {
      var tab = document.createElement('div');
      tab.className = 'iso-tab' + (idx === 0 ? ' active' : '');
      tab.textContent = clause.tab;
      tab.onclick = function () { switchIsoTab(idx); };
      tabContainer.appendChild(tab);
    });
  }

  function renderIsoClauses() {
    var container = document.getElementById('iso-clauses-container');
    container.innerHTML = '';
    ISO_CLAUSES.forEach(function (clause, idx) {
      var div = document.createElement('div');
      div.className = 'iso-clause' + (idx === 0 ? ' active' : '');
      div.id = 'iso-clause-' + idx;
      clause.questions.forEach(function (q, qIdx) {
        var key = idx + '-' + qIdx;
        var checked = state.iso[key] ? 'checked' : '';
        var item = document.createElement('div');
        item.className = 'iso-question';
        item.innerHTML =
          '<input type="checkbox" id="iso-' + key + '" ' + checked + ' onchange="toggleIso(' + idx + ',' + qIdx + ')">' +
          '<div class="qtext"><strong>' + q.q + '</strong><small>' + q.d + '</small></div>';
        div.appendChild(item);
      });
      container.appendChild(div);
    });
    updateIsoScore();
  }

  window.switchIsoTab = function (idx) {
    document.querySelectorAll('.iso-tab').forEach(function (t, i) { t.classList.toggle('active', i === idx); });
    document.querySelectorAll('.iso-clause').forEach(function (c, i) { c.classList.toggle('active', i === idx); });
  };

  window.toggleIso = function (clauseIdx, qIdx) {
    var key = clauseIdx + '-' + qIdx;
    state.iso[key] = document.getElementById('iso-' + key).checked;
    saveState();
    updateIsoScore();
  };

  function updateIsoScore() {
    var total = 0, met = 0;
    ISO_CLAUSES.forEach(function (clause, cIdx) {
      clause.questions.forEach(function (q, qIdx) {
        total++;
        if (state.iso[cIdx + '-' + qIdx]) met++;
      });
    });
    var pct = total > 0 ? Math.round((met / total) * 100) : 0;
    document.getElementById('iso-score').textContent = met + ' / ' + total + ' requirements met (' + pct + '%)';

    var verdict = document.getElementById('iso-verdict');
    if (pct >= 80) {
      verdict.textContent = 'ISO 45001 Ready — Certifiable';
      verdict.style.background = '#d4edda'; verdict.style.color = '#155724';
    } else if (pct >= 50) {
      verdict.textContent = 'Partially Compliant — Gaps remain';
      verdict.style.background = '#fff3cd'; verdict.style.color = '#856404';
    } else if (pct > 0) {
      verdict.textContent = 'Early Stage — Significant work needed';
      verdict.style.background = '#f8d7da'; verdict.style.color = '#721c24';
    } else {
      verdict.textContent = 'Not assessed';
      verdict.style.background = '#e8e8e8'; verdict.style.color = '#666';
    }
  }

  // --- Risk Matrix ---
  function renderRiskMatrix() {
    var grid = document.getElementById('risk-matrix-grid');
    grid.innerHTML = '';
    // Top-left corner
    var corner = document.createElement('div');
    corner.className = 'rm-cell header';
    corner.textContent = '';
    grid.appendChild(corner);
    // Severity headers (columns)
    SEVERITY_LABELS.forEach(function (s) {
      var cell = document.createElement('div');
      cell.className = 'rm-cell header';
      cell.textContent = s;
      grid.appendChild(cell);
    });
    // Rows: likelihood (5 down to 1, top = highest)
    for (var l = 5; l >= 1; l--) {
      var labelCell = document.createElement('div');
      labelCell.className = 'rm-cell label';
      labelCell.textContent = LIKELIHOOD_LABELS[l - 1];
      grid.appendChild(labelCell);
      for (var s = 1; s <= 5; s++) {
        var score = l * s;
        var rl = riskLevel(score);
        var cell = document.createElement('div');
        cell.className = 'rm-cell ' + rl.cls;
        cell.textContent = score;
        cell.onclick = (function (lik, sev) {
          return function () { selectMatrixCell(lik, sev); };
        })(l, s);
        grid.appendChild(cell);
      }
    }
  }

  window.selectMatrixCell = function (lik, sev) {
    // Highlight the selected cell and pre-fill the hazard form
    document.querySelectorAll('.rm-cell').forEach(function (c) { c.classList.remove('selected'); });
    var idx = 1 + 5 + (5 - lik) * 6 + sev; // account for header row + label column
    var cells = document.querySelectorAll('.rm-cell');
    if (cells[idx]) cells[idx].classList.add('selected');
    document.getElementById('hazard-likelihood').value = String(lik);
    document.getElementById('hazard-severity').value = String(sev);
  };

  window.addHazard = function () {
    var desc = document.getElementById('hazard-desc').value.trim();
    var lik = parseInt(document.getElementById('hazard-likelihood').value, 10);
    var sev = parseInt(document.getElementById('hazard-severity').value, 10);
    if (!desc || !lik || !sev) {
      alert('Please describe the hazard and select both likelihood and severity.');
      return;
    }
    var score = lik * sev;
    var rl = riskLevel(score);
    state.hazards.push({ desc: desc, likelihood: lik, severity: sev, score: score, level: rl.label, cls: rl.cls });
    saveState();
    document.getElementById('hazard-desc').value = '';
    document.getElementById('hazard-likelihood').value = '';
    document.getElementById('hazard-severity').value = '';
    renderHazards();
  };

  window.removeHazard = function (idx) {
    state.hazards.splice(idx, 1);
    saveState();
    renderHazards();
  };

  function renderHazards() {
    var container = document.getElementById('hazard-list');
    container.innerHTML = '';
    if (state.hazards.length === 0) {
      container.innerHTML = '<p style="color:#999;font-size:.85rem">No hazards logged yet.</p>';
      return;
    }
    state.hazards.forEach(function (h, idx) {
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #eee;flex-wrap:wrap';
      div.innerHTML =
        '<span class="rm-tag ' + h.cls + '" style="padding:4px 10px;border-radius:4px;font-size:.75rem;font-weight:700">' + h.level + ' (' + h.score + ')</span>' +
        '<span style="flex:1;min-width:150px;font-size:.85rem">' + h.desc + '</span>' +
        '<span style="font-size:.8rem;color:#888">' + LIKELIHOOD_LABELS[h.likelihood - 1] + ' × ' + SEVERITY_LABELS[h.severity - 1] + '</span>' +
        '<button class="cert-btn" onclick="removeHazard(' + idx + ')">Remove</button>';
      container.appendChild(div);
    });
  }

  // --- Init ---
  function renderAll() {
    renderStats();
    renderInspections();
  }

  renderAll();
  renderChecklist();
  renderIsoTabs();
  renderIsoClauses();
  renderRiskMatrix();
  renderHazards();
})();
