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

  var STORAGE_KEY = 'jmk_canary_data';

  // --- State ---
  var state = loadState();

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.inspections) return saved;
    } catch (e) {}
    return { inspections: DEFAULT_INSPECTIONS.slice(), checklist: {} };
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

  // --- Init ---
  function renderAll() {
    renderStats();
    renderInspections();
  }

  renderAll();
  renderChecklist();
})();
