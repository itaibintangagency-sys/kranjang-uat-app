// ===== Kranjang UAT App — Validasi Kode Akses =====

const input = document.getElementById("accessCode");
const btn = document.getElementById("submitBtn");
const errorBox = document.getElementById("errorBox");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add("show");
}
function hideError() {
  errorBox.classList.remove("show");
}

async function handleSubmit() {
  const code = input.value.trim().toUpperCase();
  hideError();

  if (!code) {
    showError("Yuk, isi dulu kode aksesnya ya.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Memeriksa...";

  try {
    const { data, error } = await db.rpc("validate_access_code", { input_code: code });

    if (error) {
      console.error(error);
      showError("Terjadi kendala. Coba lagi sebentar ya.");
      return;
    }

    if (!data || data.length === 0) {
      showError("Kode akses tidak ditemukan. Cek lagi penulisannya ya.");
      return;
    }

    const tester = data[0];
    tester.access_code = code; // disimpan agar dashboard super admin bisa verifikasi ulang
    // Simpan info tester di browser (session ini saja)
    sessionStorage.setItem("kranjang_tester", JSON.stringify(tester));

    if (tester.role === "super_admin") {
      window.location.href = "admin/dashboard.html";
    } else {
      window.location.href = "test.html";
    }
  } catch (e) {
    console.error(e);
    showError("Terjadi kendala jaringan. Coba lagi ya.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Mulai Uji Coba →";
  }
}

btn.addEventListener("click", handleSubmit);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSubmit();
});
input.focus();
