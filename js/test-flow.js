// ===== Kranjang UAT App — Alur Testing Step-by-Step =====

const roleLabels = {
  kol: "🌟 Kamu sedang menguji sisi KOL / Influencer",
  brand: "🏢 Kamu sedang menguji sisi Brand",
  admin: "⚙️ Kamu sedang menguji sisi Admin",
};

let tester = null;
let steps = [];
let glossaryMap = {};
let currentIndex = 0;
let selectedFeedback = null;

const mainCard = document.getElementById("mainCard");

function getTester() {
  const raw = sessionStorage.getItem("kranjang_tester");
  if (!raw) {
    window.location.href = "index.html";
    return null;
  }
  return JSON.parse(raw);
}

async function loadGlossary() {
  const { data, error } = await db.from("glossary").select("term, definition");
  if (error) { console.error(error); return; }
  data.forEach((g) => { glossaryMap[g.term] = g.definition; });
}

async function loadSteps(role) {
  const { data, error } = await db
    .from("test_steps")
    .select("*")
    .eq("role", role)
    .order("step_order", { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

function renderStep() {
  const step = steps[currentIndex];
  const total = steps.length;
  const percent = Math.round(((currentIndex + 1) / total) * 100);
  selectedFeedback = null;

  const glossaryHtml = (step.glossary_terms || [])
    .filter((t) => glossaryMap[t])
    .map((t) => `<div class="glossary-item"><b>${escapeHtml(t)}</b> — ${escapeHtml(glossaryMap[t])}</div>`)
    .join("");

  mainCard.innerHTML = `
    <span class="role-badge role-${tester.role}">${roleLabels[tester.role] || tester.role}</span>

    <div class="progress-wrap">
      <div class="progress-label">
        <span>Langkah ${currentIndex + 1} dari ${total}</span>
        <span>${percent}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    </div>

    <div class="step-title">${escapeHtml(step.title)}</div>
    <div class="step-instruction">${escapeHtml(step.instruction).replace(/\\n/g, "\n")}</div>

    ${step.warning_note ? `
      <div class="step-warning">
        <span class="icon">⚠️</span>
        <span>${escapeHtml(step.warning_note)}</span>
      </div>` : ""}

    ${glossaryHtml ? `
      <div class="glossary-box">
        <div class="glossary-toggle" id="glossaryToggle">📖 Ada istilah yang asing? Ketuk di sini</div>
        <div class="glossary-list" id="glossaryList">${glossaryHtml}</div>
      </div>` : ""}

    <p class="muted" style="margin-bottom:6px">
      👉 Coba lakukan langkah di atas langsung di aplikasi Kranjang kamu, lalu kasih tahu kami gimana rasanya:
    </p>

    <div class="feedback-section">
      <div class="feedback-options">
        <button class="feedback-btn" data-value="easy">
          <span class="emoji">😀</span> Mudah
        </button>
        <button class="feedback-btn" data-value="confusing">
          <span class="emoji">😐</span> Agak Bingung
        </button>
        <button class="feedback-btn" data-value="difficult">
          <span class="emoji">😣</span> Sulit
        </button>
      </div>
      <div class="field">
        <label for="commentBox">Ada catatan tambahan? (boleh dikosongkan)</label>
        <textarea id="commentBox" placeholder="Ceritakan apa yang kamu alami di langkah ini..."></textarea>
      </div>
    </div>

    <div class="error-msg" id="stepError"></div>

    <button class="btn btn-primary" id="nextBtn">
      ${currentIndex === total - 1 ? "Selesai & Lihat Ringkasan →" : "Lanjut ke Langkah Berikutnya →"}
    </button>
  `;

  document.querySelectorAll(".feedback-btn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".feedback-btn").forEach((x) => {
        x.classList.remove("selected-easy", "selected-confusing", "selected-difficult");
      });
      selectedFeedback = b.dataset.value;
      b.classList.add("selected-" + selectedFeedback);
    });
  });

  const gToggle = document.getElementById("glossaryToggle");
  if (gToggle) {
    gToggle.addEventListener("click", () => {
      document.getElementById("glossaryList").classList.toggle("open");
    });
  }

  document.getElementById("nextBtn").addEventListener("click", handleNext);
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function handleNext() {
  const errBox = document.getElementById("stepError");
  errBox.classList.remove("show");

  if (!selectedFeedback) {
    errBox.textContent = "Pilih salah satu dulu ya: Mudah, Agak Bingung, atau Sulit.";
    errBox.classList.add("show");
    return;
  }

  const comment = document.getElementById("commentBox").value.trim();
  const step = steps[currentIndex];
  const btn = document.getElementById("nextBtn");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  const { error } = await db.from("step_responses").insert({
    tester_id: tester.id,
    step_id: step.id,
    feedback: selectedFeedback,
    comment: comment || null,
  });

  if (error) {
    console.error(error);
    errBox.textContent = "Gagal menyimpan. Coba lagi ya.";
    errBox.classList.add("show");
    btn.disabled = false;
    btn.textContent = "Lanjut ke Langkah Berikutnya →";
    return;
  }

  if (currentIndex < steps.length - 1) {
    currentIndex++;
    renderStep();
  } else {
    window.location.href = "summary.html";
  }
}

async function init() {
  tester = getTester();
  if (!tester) return;

  if (tester.role === "super_admin") {
    window.location.href = "admin/dashboard.html";
    return;
  }

  await loadGlossary();
  steps = await loadSteps(tester.role);

  if (!steps.length) {
    mainCard.innerHTML = `<div class="text-center muted">Belum ada langkah uji coba untuk peranmu. Hubungi tim penyelenggara.</div>`;
    return;
  }

  renderStep();
}

init();
