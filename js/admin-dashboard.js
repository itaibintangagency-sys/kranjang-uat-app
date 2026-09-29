// ===== Kranjang UAT App — Dashboard Super Admin =====

let allRows = [];

function getTester() {
  const raw = sessionStorage.getItem("kranjang_tester");
  if (!raw) {
    window.location.href = "../index.html";
    return null;
  }
  const t = JSON.parse(raw);
  if (t.role !== "super_admin") {
    window.location.href = "../index.html";
    return null;
  }
  return t;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const feedbackLabel = { easy: "😀 Mudah", confusing: "😐 Agak Bingung", difficult: "😣 Sulit" };
const roleLabel = { kol: "🌟 KOL", brand: "🏢 Brand", admin: "⚙️ Admin" };

function renderStats(rows) {
  document.getElementById("statTotal").textContent = rows.length;
  document.getElementById("statEasy").textContent = rows.filter((r) => r.feedback === "easy").length;
  document.getElementById("statConfusing").textContent = rows.filter((r) => r.feedback === "confusing").length;
  document.getElementById("statDifficult").textContent = rows.filter((r) => r.feedback === "difficult").length;
}

function renderTable(rows) {
  const tbody = document.getElementById("resultsBody");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center muted" style="padding:24px">Belum ada data yang cocok.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${roleLabel[r.step_role] || r.step_role}</td>
      <td>${escapeHtml(r.step_title)}</td>
      <td>${escapeHtml(r.tester_name || "-")}</td>
      <td><span class="pill pill-${r.feedback}">${feedbackLabel[r.feedback]}</span></td>
      <td>${escapeHtml(r.comment || "-")}</td>
      <td class="muted">${new Date(r.submitted_at).toLocaleString("id-ID")}</td>
    </tr>`
    )
    .join("");
}

function applyFilters() {
  const role = document.getElementById("filterRole").value;
  const feedback = document.getElementById("filterFeedback").value;
  const filtered = allRows.filter(
    (r) => (!role || r.step_role === role) && (!feedback || r.feedback === feedback)
  );
  renderStats(filtered);
  renderTable(filtered);
}

function exportCSV() {
  const cols = ["Peran", "Langkah", "Tester", "Feedback", "Komentar", "Waktu"];
  const rows = allRows.map((r) => [
    r.step_role,
    `"${(r.step_title || "").replace(/"/g, '""')}"`,
    `"${(r.tester_name || "").replace(/"/g, '""')}"`,
    r.feedback,
    `"${(r.comment || "").replace(/"/g, '""')}"`,
    r.submitted_at,
  ].join(","));
  const csv = [cols.join(","), ...rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
  a.download = "kranjang_uat_feedback.csv";
  a.click();
}

async function init() {
  const tester = getTester();
  if (!tester) return;

  const { data, error } = await db.rpc("get_dashboard_data", { input_code: tester.access_code || "" });

  // access_code tidak tersimpan di sessionStorage secara default —
  // jadi kita simpan ulang saat login khusus untuk super_admin (lihat catatan di access.js / README)
  if (error || !data) {
    console.error(error);
    document.getElementById("resultsBody").innerHTML =
      `<tr><td colspan="6" class="text-center muted" style="padding:24px">Gagal memuat data. Pastikan kode akses super admin valid.</td></tr>`;
    return;
  }

  allRows = data;
  renderStats(allRows);
  renderTable(allRows);

  document.getElementById("filterRole").addEventListener("change", applyFilters);
  document.getElementById("filterFeedback").addEventListener("change", applyFilters);
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
}

init();
