// ===== Kranjang UAT App — Dashboard Super Admin (Multi-Tab + CRUD) =====

let accessCode = "";
let allTesters = [];
let allFeedback = [];
let allSessions = [];
let allSteps = [];
let allGlossary = [];
let editingTesterId = null;
let editingFeedbackId = null;

const feedbackLabel = { easy: "😀 Mudah", confusing: "😐 Agak Bingung", difficult: "😣 Sulit" };
const roleLabel = { kol: "🌟 KOL", brand: "🏢 Brand", admin: "⚙️ Admin", super_admin: "👑 Super Admin" };

function esc(str) {
  if (!str && str !== 0) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getTester() {
  const raw = sessionStorage.getItem("kranjang_tester");
  if (!raw) { window.location.href = "../index.html"; return null; }
  const t = JSON.parse(raw);
  if (t.role !== "super_admin") { window.location.href = "../index.html"; return null; }
  return t;
}

function showToast(msg) {
  alert(msg); // sederhana & pasti terlihat oleh pengguna non-teknis
}

// ============ TAB SWITCHING ============
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });
}

// ============ RINGKASAN ============
function renderRingkasan() {
  document.getElementById("statTesters").textContent = allTesters.length;
  document.getElementById("statFeedback").textContent = allFeedback.length;
  document.getElementById("statEasy").textContent = allFeedback.filter((r) => r.feedback === "easy").length;
  document.getElementById("statConfusing").textContent = allFeedback.filter((r) => r.feedback === "confusing").length;
  document.getElementById("statDifficult").textContent = allFeedback.filter((r) => r.feedback === "difficult").length;
  document.getElementById("statSessions").textContent = allSessions.length;
}

// ============ TAB TESTER ============
async function loadTesters() {
  const { data, error } = await db.rpc("get_all_testers", { input_code: accessCode });
  if (error) { console.error(error); return; }
  allTesters = data || [];
}

function renderTesters() {
  const search = document.getElementById("testerSearch").value.toLowerCase();
  const roleFilter = document.getElementById("testerRoleFilter").value;

  const rows = allTesters.filter((t) => {
    const matchSearch = !search ||
      (t.name || "").toLowerCase().includes(search) ||
      (t.access_code || "").toLowerCase().includes(search);
    const matchRole = !roleFilter || t.role === roleFilter;
    return matchSearch && matchRole;
  });

  const tbody = document.getElementById("testerBody");
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada tester yang cocok.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((t) => {
    const progress = t.role === "super_admin" ? "—" : `${t.steps_done} / ${t.steps_total} langkah`;
    const rating = t.overall_rating ? "⭐".repeat(t.overall_rating) : "—";
    return `
    <tr>
      <td><code>${esc(t.access_code)}</code></td>
      <td>${esc(t.name || "-")}</td>
      <td>${roleLabel[t.role] || t.role}</td>
      <td>${progress}</td>
      <td>${rating}</td>
      <td class="muted">${new Date(t.created_at).toLocaleDateString("id-ID")}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" onclick="openTesterModal('${t.id}')" title="Edit">✏️</button>
          <button class="icon-btn danger" onclick="handleDeleteTester('${t.id}', '${esc(t.access_code)}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function openTesterModal(id) {
  editingTesterId = id || null;
  document.getElementById("testerModalError").classList.remove("show");

  if (id) {
    const t = allTesters.find((x) => x.id === id);
    document.getElementById("testerModalTitle").textContent = "✏️ Edit Tester";
    document.getElementById("m-access-code").value = t.access_code;
    document.getElementById("m-name").value = t.name || "";
    document.getElementById("m-role").value = t.role;
  } else {
    document.getElementById("testerModalTitle").textContent = "+ Tambah Tester";
    document.getElementById("m-access-code").value = "";
    document.getElementById("m-name").value = "";
    document.getElementById("m-role").value = "kol";
  }
  document.getElementById("testerModalOverlay").classList.add("open");
}

function closeTesterModal() {
  document.getElementById("testerModalOverlay").classList.remove("open");
  editingTesterId = null;
}

async function saveTesterModal() {
  const code = document.getElementById("m-access-code").value.trim().toUpperCase();
  const name = document.getElementById("m-name").value.trim();
  const role = document.getElementById("m-role").value;
  const errBox = document.getElementById("testerModalError");
  errBox.classList.remove("show");

  if (!code) {
    errBox.textContent = "Kode akses wajib diisi.";
    errBox.classList.add("show");
    return;
  }

  try {
    if (editingTesterId) {
      const { error } = await db.rpc("update_tester", {
        input_code: accessCode, p_id: editingTesterId, p_access_code: code, p_name: name || null, p_role: role,
      });
      if (error) throw error;
    } else {
      const { error } = await db.rpc("add_tester", {
        input_code: accessCode, p_access_code: code, p_name: name || null, p_role: role,
      });
      if (error) throw error;
    }
    closeTesterModal();
    await loadTesters();
    renderTesters();
    renderRingkasan();
  } catch (e) {
    console.error(e);
    errBox.textContent = e.message && e.message.includes("duplicate")
      ? "Kode akses ini sudah dipakai tester lain."
      : "Gagal menyimpan. Coba lagi ya.";
    errBox.classList.add("show");
  }
}

async function handleDeleteTester(id, code) {
  if (!confirm(`Hapus tester "${code}"? Semua feedback dan sesi miliknya juga akan terhapus.`)) return;
  const { error } = await db.rpc("delete_tester", { input_code: accessCode, p_id: id });
  if (error) { console.error(error); showToast("Gagal menghapus tester."); return; }
  await loadTesters();
  await loadFeedback();
  await loadSessions();
  renderTesters();
  renderFeedback();
  renderSessions();
  renderRingkasan();
}

// ============ TAB FEEDBACK ============
async function loadFeedback() {
  const { data, error } = await db.rpc("get_dashboard_data", { input_code: accessCode });
  if (error) { console.error(error); return; }
  allFeedback = data || [];
}

function renderFeedback() {
  const search = document.getElementById("fbSearch").value.toLowerCase();
  const roleFilter = document.getElementById("fbRoleFilter").value;
  const fbFilter = document.getElementById("fbFeedbackFilter").value;

  const rows = allFeedback.filter((r) => {
    const matchSearch = !search ||
      (r.step_title || "").toLowerCase().includes(search) ||
      (r.tester_name || "").toLowerCase().includes(search) ||
      (r.comment || "").toLowerCase().includes(search);
    const matchRole = !roleFilter || r.step_role === roleFilter;
    const matchFb = !fbFilter || r.feedback === fbFilter;
    return matchSearch && matchRole && matchFb;
  });

  const tbody = document.getElementById("feedbackBody");
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada feedback yang cocok.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td>${roleLabel[r.step_role] || r.step_role}</td>
      <td>${esc(r.step_title)}</td>
      <td>${esc(r.tester_name || "-")}</td>
      <td><span class="pill pill-${r.feedback}">${feedbackLabel[r.feedback]}</span></td>
      <td>${esc(r.comment || "-")}</td>
      <td class="muted">${new Date(r.submitted_at).toLocaleString("id-ID")}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" onclick="openFeedbackModal('${r.response_id}')" title="Edit">✏️</button>
          <button class="icon-btn danger" onclick="handleDeleteFeedback('${r.response_id}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>`).join("");
}

function openFeedbackModal(id) {
  editingFeedbackId = id;
  const r = allFeedback.find((x) => x.response_id === id);
  if (!r) return;
  document.getElementById("fbModalError").classList.remove("show");
  document.getElementById("m-fb-feedback").value = r.feedback;
  document.getElementById("m-fb-comment").value = r.comment || "";
  document.getElementById("fbModalOverlay").classList.add("open");
}

function closeFeedbackModal() {
  document.getElementById("fbModalOverlay").classList.remove("open");
  editingFeedbackId = null;
}

async function saveFeedbackModal() {
  const feedback = document.getElementById("m-fb-feedback").value;
  const comment = document.getElementById("m-fb-comment").value.trim();
  const errBox = document.getElementById("fbModalError");

  const { error } = await db.rpc("update_feedback", {
    input_code: accessCode, p_id: editingFeedbackId, p_feedback: feedback, p_comment: comment || null,
  });

  if (error) {
    console.error(error);
    errBox.textContent = "Gagal menyimpan perubahan.";
    errBox.classList.add("show");
    return;
  }

  closeFeedbackModal();
  await loadFeedback();
  renderFeedback();
  renderRingkasan();
}

async function handleDeleteFeedback(id) {
  if (!confirm("Hapus entri feedback ini?")) return;
  const { error } = await db.rpc("delete_feedback", { input_code: accessCode, p_id: id });
  if (error) { console.error(error); showToast("Gagal menghapus feedback."); return; }
  await loadFeedback();
  renderFeedback();
  renderRingkasan();
}

function exportFeedbackCSV() {
  const cols = ["Peran", "Langkah", "Tester", "Feedback", "Komentar", "Waktu"];
  const rows = allFeedback.map((r) => [
    r.step_role, `"${(r.step_title || "").replace(/"/g, '""')}"`,
    `"${(r.tester_name || "").replace(/"/g, '""')}"`, r.feedback,
    `"${(r.comment || "").replace(/"/g, '""')}"`, r.submitted_at,
  ].join(","));
  const csv = [cols.join(","), ...rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
  a.download = "kranjang_uat_feedback.csv";
  a.click();
}

// ============ TAB SESI TESTING ============
async function loadSessions() {
  const { data, error } = await db.rpc("get_all_sessions", { input_code: accessCode });
  if (error) { console.error(error); return; }
  allSessions = data || [];
}

function renderSessions() {
  const search = document.getElementById("sesSearch").value.toLowerCase();
  const ratingFilter = document.getElementById("sesRatingFilter").value;

  const rows = allSessions.filter((s) => {
    const matchSearch = !search || (s.tester_name || "").toLowerCase().includes(search);
    const matchRating = !ratingFilter || String(s.overall_rating) === ratingFilter;
    return matchSearch && matchRating;
  });

  const tbody = document.getElementById("sesiBody");
  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Belum ada sesi testing yang selesai.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((s) => `
    <tr>
      <td>${esc(s.tester_name || "-")}</td>
      <td>${roleLabel[s.tester_role] || s.tester_role}</td>
      <td>${"⭐".repeat(s.overall_rating || 0)}</td>
      <td>${esc(s.overall_comment || "-")}</td>
      <td class="muted">${s.completed_at ? new Date(s.completed_at).toLocaleString("id-ID") : "-"}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn danger" onclick="handleDeleteSession('${s.id}')" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>`).join("");
}

async function handleDeleteSession(id) {
  if (!confirm("Hapus data sesi ini?")) return;
  const { error } = await db.rpc("delete_session", { input_code: accessCode, p_id: id });
  if (error) { console.error(error); showToast("Gagal menghapus sesi."); return; }
  await loadSessions();
  renderSessions();
  renderRingkasan();
}

// ============ TAB REFERENSI ============
async function loadReference() {
  const [stepsRes, glossaryRes] = await Promise.all([
    db.from("test_steps").select("*").order("role").order("step_order"),
    db.from("glossary").select("*").order("term"),
  ]);
  allSteps = stepsRes.data || [];
  allGlossary = glossaryRes.data || [];
}

function renderReference() {
  const search = document.getElementById("refSearch").value.toLowerCase();

  const steps = allSteps.filter((s) =>
    !search || s.title.toLowerCase().includes(search) || s.instruction.toLowerCase().includes(search)
  );
  const glossary = allGlossary.filter((g) =>
    !search || g.term.toLowerCase().includes(search) || g.definition.toLowerCase().includes(search)
  );

  document.getElementById("refSteps").innerHTML = steps.length
    ? steps.map((s) => `
      <div class="ref-step-card">
        <div class="rt">${roleLabel[s.role] || s.role} · Langkah ${s.step_order}</div>
        <div class="rs">${esc(s.title)}</div>
      </div>`).join("")
    : `<p class="muted">Tidak ada langkah yang cocok.</p>`;

  document.getElementById("refGlossary").innerHTML = glossary.length
    ? glossary.map((g) => `
      <div class="ref-glossary-item">
        <b>${esc(g.term)}</b>
        <span style="flex:1;text-align:right;color:var(--muted)">${esc(g.definition)}</span>
      </div>`).join("")
    : `<p class="muted">Tidak ada istilah yang cocok.</p>`;
}

// ============ INIT ============
async function init() {
  const tester = getTester();
  if (!tester) return;
  accessCode = tester.access_code || "";

  setupTabs();

  await Promise.all([loadTesters(), loadFeedback(), loadSessions(), loadReference()]);

  renderRingkasan();
  renderTesters();
  renderFeedback();
  renderSessions();
  renderReference();

  // Tester tab events
  document.getElementById("testerSearch").addEventListener("input", renderTesters);
  document.getElementById("testerRoleFilter").addEventListener("change", renderTesters);
  document.getElementById("addTesterBtn").addEventListener("click", () => openTesterModal(null));
  document.getElementById("testerModalCancel").addEventListener("click", closeTesterModal);
  document.getElementById("testerModalSave").addEventListener("click", saveTesterModal);

  // Feedback tab events
  document.getElementById("fbSearch").addEventListener("input", renderFeedback);
  document.getElementById("fbRoleFilter").addEventListener("change", renderFeedback);
  document.getElementById("fbFeedbackFilter").addEventListener("change", renderFeedback);
  document.getElementById("exportBtn").addEventListener("click", exportFeedbackCSV);
  document.getElementById("fbModalCancel").addEventListener("click", closeFeedbackModal);
  document.getElementById("fbModalSave").addEventListener("click", saveFeedbackModal);

  // Sesi tab events
  document.getElementById("sesSearch").addEventListener("input", renderSessions);
  document.getElementById("sesRatingFilter").addEventListener("change", renderSessions);

  // Referensi tab events
  document.getElementById("refSearch").addEventListener("input", renderReference);
}

init();
