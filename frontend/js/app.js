const API_URL = "https://sisdig-ai-backend.vercel.app";

let selectedFile = null;
let currentMaterialsData = [];

async function apiFetch(endpoint, options = {}) {
    const fullUrl = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
    return fetch(fullUrl, options);
}

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    checkServerHealth();
    setupUploadHandlers();
    setupNavigation();
    loadWeeklyMaterials();
    setupSearchFilter();

    setInterval(checkServerHealth, 15000);
});

/* ==========================================================================
   1. SERVER HEALTH & STATUS INDICATOR
   ========================================================================== */
async function checkServerHealth() {
    const statusIndicator = document.getElementById("serverStatusIndicator");
    try {
        const response = await apiFetch("/materials");

        if (statusIndicator) {
            if (response.ok) {
                statusIndicator.className = "status-online";
                statusIndicator.innerHTML = '<i class="fa-solid fa-circle"></i> Online';
            } else {
                statusIndicator.className = "status-offline";
                statusIndicator.innerHTML = '<i class="fa-solid fa-circle"></i> Offline';
            }
        }
    } catch (e) {
        if (statusIndicator) {
            statusIndicator.className = "status-offline";
            statusIndicator.innerHTML = '<i class="fa-solid fa-circle"></i> Offline';
        }
        console.warn("Backend server offline / unreachable.", e);
    }
}

/* ==========================================================================
   2. NAVIGATION & PAGE STATE
   ========================================================================== */
function setupNavigation() {
    const backBtn = document.getElementById("backToHomeBtn");
    const refreshBtn = document.getElementById("refreshMaterialsBtn");

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            showLandingPage();
            loadWeeklyMaterials();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadWeeklyMaterials);
    }
}

function showLandingPage() {
    const landing = document.getElementById("landingPage");
    const learning = document.getElementById("learningPage");
    if (landing) landing.style.display = "block";
    if (learning) learning.style.display = "none";
    document.title = "SISDIG AI - Media Pembelajaran Sistem Digital";
}

function showLearningPage() {
    const landing = document.getElementById("landingPage");
    const learning = document.getElementById("learningPage");
    if (landing) landing.style.display = "none";
    if (learning) learning.style.display = "block";
}

/* ==========================================================================
   3. ARCHIVE MATERIALS (GET & DELETE)
   ========================================================================== */
async function loadWeeklyMaterials() {
    const container = document.getElementById("materialsList");
    if (!container) return;

    container.innerHTML = `<div class="loading-spinner" style="padding: 20px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar modul...</div>`;

    try {
        const response = await apiFetch("/materials");
        if (!response.ok) throw new Error("Gagal mengambil data materi.");

        currentMaterialsData = await response.json();
        renderMaterialsList(currentMaterialsData);
    } catch (error) {
        console.error("Error loadWeeklyMaterials:", error);
        container.innerHTML = `
            <div style="text-align: center; color: var(--rose, #ef4444); padding: 20px;">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p style="font-size: 0.88rem; margin-top: 5px;">Gagal terhubung ke backend FastAPI.</p>
            </div>
        `;
    }
}

function renderMaterialsList(materials) {
    window.currentMaterialsData = materials;

    const container = document.getElementById("materialsList");
    if (!container) return;

    if (!Array.isArray(materials) || materials.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted, #94a3b8); padding: 25px;">
                <i class="fa-regular fa-folder-open" style="font-size: 1.8rem; margin-bottom: 8px;"></i>
                <p style="font-size: 0.88rem;">Belum ada materi tersimpan.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    materials.forEach((item) => {
        if (!item) return;

        const card = document.createElement("div");
        card.className = "material-card-item";

        const filename = item.filename || "";
        const title = item.title || filename.replace(".json", "") || "Modul Tanpa Judul";
        const course = item.course || "Sistem Digital";
        const currentWeek = parseInt(item.week, 10) || 1;

        let weekOptions = "";
        for (let i = 1; i <= 14; i++) {
            const isSelected = currentWeek === i ? "selected" : "";
            weekOptions += `<option value="${i}" ${isSelected}>Minggu${i}</option>`;
        }

        card.innerHTML = `
            <div class="material-info" style="flex: 1;">
                <h4>${escapeHTML(title)}</h4>
                <div class="material-meta" style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                    <select class="select-week-dropdown" 
                            data-filename="${escapeHTML(filename)}"
                            style="padding: 2px 6px; border-radius: 4px; border: 1px solid #2563eb; background: #eff6ff; color: #1e40af; font-weight: 600; font-size: 0.78rem; cursor: pointer; outline: none;">
                        ${weekOptions}
                    </select>
                    <span><i class="fa-solid fa-book"></i> ${escapeHTML(course)}</span>
                </div>
            </div>
            <button class="btn-delete-item" title="Hapus Modul" data-filename="${escapeHTML(filename)}">
                <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
            </button>
        `;

        card.addEventListener("click", (e) => {
            if (e.target.classList.contains("select-week-dropdown")) {
                e.stopPropagation();
                return;
            }

            const deleteBtn = e.target.closest(".btn-delete-item");
            if (deleteBtn) {
                e.stopPropagation();
                const fname = deleteBtn.getAttribute("data-filename");
                deleteMaterial(e, fname);
                return;
            }

            if (typeof openMaterial === "function" && filename) {
                openMaterial(filename);
            }
        });

        const selectElem = card.querySelector(".select-week-dropdown");
        if (selectElem) {
            selectElem.addEventListener("change", (e) => {
                e.stopPropagation();
                const fname = selectElem.getAttribute("data-filename");
                const newWeekVal = parseInt(selectElem.value, 10);
                changeMaterialWeekDirect(fname, newWeekVal);
            });
            selectElem.addEventListener("click", (e) => e.stopPropagation());
        }

        container.appendChild(card);
    });
}

function changeMaterialWeekDirect(filename, newWeek) {
    const list = window.currentMaterialsData || [];
    const item = list.find(m => m.filename === filename);

    if (item) {
        item.week = newWeek;
        console.log(`Berhasil mengubah ${filename} ke Minggu${newWeek}`);
    }
}

function setupSearchFilter() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = currentMaterialsData.filter(item => 
            (item.title && item.title.toLowerCase().includes(query)) || 
            (item.course && item.course.toLowerCase().includes(query))
        );
        renderMaterialsList(filtered);
    });
}

async function openMaterial(filename) {
    try {
        const response = await apiFetch(`/media/${filename}`);
        if (!response.ok) throw new Error("Gagal memuat materi.");

        const mediaData = await response.json();
        renderGeneratedMedia(mediaData);
        showLearningPage();
    } catch (error) {
        alert(`Gagal membuka modul: ${error.message}`);
    }
}

async function deleteMaterial(event, filename) {
    if (event) event.stopPropagation();
    if (!confirm("Hapus modul ini dari arsip?")) return;

    try {
        const response = await apiFetch(`/materials/${filename}`, { 
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Gagal menghapus.");
        loadWeeklyMaterials();
    } catch (error) {
        alert(error.message);
    }
}

/* ==========================================================================
   4. FILE UPLOAD & AI PROCESSING
   ========================================================================== */
function setupUploadHandlers() {
    const input = document.getElementById("pptInput");
    const selectBtn = document.getElementById("selectFileButton");
    const dropZone = document.getElementById("dropZone");
    const processBtn = document.getElementById("processButton");

    if (!input || !dropZone) return;

    selectBtn.addEventListener("click", () => input.click());

    input.addEventListener("change", (e) => handleSelectedFile(e.target.files[0]));

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        handleSelectedFile(e.dataTransfer.files[0]);
    });

    if (processBtn) {
        processBtn.addEventListener("click", uploadAndProcessFile);
    }
}

function handleSelectedFile(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== "ppt" && ext !== "pptx") {
        showStatus("File harus berformat .ppt atau .pptx!", true);
        return;
    }

    selectedFile = file;

    const infoBox = document.getElementById("fileInfo");
    const processBtn = document.getElementById("processButton");

    if (infoBox) {
        infoBox.style.display = "block";
        infoBox.innerHTML = `<i class="fa-solid fa-file-powerpoint" style="color:var(--rose);"></i> <strong>${escapeHTML(file.name)}</strong> (${formatBytes(file.size)})`;
    }

    if (processBtn) processBtn.style.display = "inline-flex";
    showStatus("File siap diolah AI.", false);
}

async function uploadAndProcessFile() {
    if (!selectedFile) return;

    const weekSelect = document.getElementById("uploadWeekSelect") || 
                       document.querySelector('select[name="minggu"]') || 
                       document.querySelector('select[name="week"]');
    const selectedWeek = weekSelect ? (parseInt(weekSelect.value, 10) || 1) : 1;

    const processBtn = document.getElementById("processButton");
    const progressContainer = document.getElementById("progressContainer");
    const progressFill = document.getElementById("progressBarFill");
    const progressText = document.getElementById("progressText");

    if (processBtn) processBtn.disabled = true;
    if (progressContainer) progressContainer.style.display = "block";

    let progress = 10;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = "Mengunggah file PPT...";

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("week", selectedWeek.toString());

    try {
        const interval = setInterval(() => {
            if (progress < 85) {
                progress += 15;
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) {
                    if (progress > 40) progressText.textContent = "Menganalisis konten & mengekstrak slide...";
                    if (progress > 70) progressText.textContent = "Menjadikan modul interaktif dengan AI...";
                }
            }
        }, 500);

        const response = await apiFetch("/process", {
            method: "POST",
            body: formData
        });

        clearInterval(interval);
        const result = await response.json();

        if (!response.ok || result.error) throw new Error(result.detail || result.error);

        if (progressFill) progressFill.style.width = "100%";
        if (progressText) progressText.textContent = "Selesai!";

        await loadWeeklyMaterials();

        setTimeout(() => {
            if (typeof renderGeneratedMedia === "function") renderGeneratedMedia(result.media);
            if (typeof showLearningPage === "function") showLearningPage();
            if (typeof resetUploadForm === "function") resetUploadForm();
        }, 600);

    } catch (error) {
        if (typeof showStatus === "function") showStatus(`Error: ${error.message}`, true);
        if (processBtn) processBtn.disabled = false;
        if (progressContainer) progressContainer.style.display = "none";
    }
}

function resetUploadForm() {
    selectedFile = null;
    const fileInfo = document.getElementById("fileInfo");
    const progressContainer = document.getElementById("progressContainer");
    const processButton = document.getElementById("processButton");

    if (fileInfo) fileInfo.style.display = "none";
    if (progressContainer) progressContainer.style.display = "none";
    if (processButton) {
        processButton.style.display = "none";
        processButton.disabled = false;
    }
    showStatus("", false);
}

/* ==========================================================================
   5. RENDER MODULE MEDIA & INTERACTIVE VIEWER
   ========================================================================== */
function renderGeneratedMedia(media) {
    if (!media) return;

    const badge = document.getElementById("weekBadge");
    if (badge) {
        badge.innerHTML = `Minggu ${media.week || 1} <i class="fa-solid fa-pen-to-square" style="font-size: 0.8rem; margin-left: 6px;"></i>`;
        badge.style.cursor = "pointer";
        badge.style.textDecoration = "underline";
        badge.title = "Klik untuk mengubah minggu";

        badge.onclick = function() {
            const newWeek = prompt("Pindahkan materi ini ke Minggu ke berapa?", media.week || 1);
            if (newWeek && !isNaN(newWeek) && newWeek != media.week) {
                media.week = parseInt(newWeek, 10);
                badge.innerHTML = `Minggu ${media.week} <i class="fa-solid fa-pen-to-square" style="font-size: 0.8rem; margin-left: 6px;"></i>`;
                
                const list = window.currentMaterialsData || [];
                const item = list.find(m => m.title === media.title);
                if (item) {
                    item.week = media.week;
                    renderMaterialsList(list);
                }
                alert(`Berhasil! Materi dipindahkan ke Minggu ${media.week}`);
            }
        };
    }

    const titleHeader = document.getElementById("moduleTitleHeader");
    if (titleHeader) titleHeader.textContent = media.title || "Materi Sistem Digital";
    document.title = `${media.title || "Modul"} - SISDIG AI`;

    const rawSections = Array.isArray(media.sections) ? media.sections : [];
    const sections = rawSections.filter(sec => {
        const title = (sec.title || "").toLowerCase();
        return !title.includes("latihan soal");
    });

    const menuContainer = document.getElementById("menuContainer");
    if (menuContainer) {
        menuContainer.innerHTML = "";

        const introBtn = document.createElement("button");
        introBtn.className = "menu-btn active";
        introBtn.innerHTML = `<i class="fa-solid fa-compass"></i> Pendahuluan`;
        introBtn.onclick = function() { switchSection("sec-intro", this); };
        menuContainer.appendChild(introBtn);

        sections.forEach((sec, idx) => {
            const btn = document.createElement("button");
            btn.className = "menu-btn";
            btn.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${escapeHTML(sec.title || `Sub-bab ${idx + 1}`)}`;
            btn.onclick = function() { switchSection(`sec-${idx}`, this); };
            menuContainer.appendChild(btn);
        });
    }

    const mainContent = document.getElementById("content");
    if (mainContent) {
        mainContent.innerHTML = "";

        const introSec = document.createElement("div");
        introSec.id = "sec-intro";
        introSec.className = "section-content active";
        introSec.style.display = "block";
        introSec.innerHTML = `
            <span class="section-tag">OVERVIEW MODUL</span>
            <h2 class="section-title">${escapeHTML(media.title || "Modul Pembelajaran")}</h2>
            <p class="content-paragraph">${formatMarkdownText(media.description || "Selamat datang di modul interaktif Sistem Digital.")}</p>
            <div class="objective-card">
                <h3><i class="fa-solid fa-bullseye"></i> Capaian Pembelajaran</h3>
                <ul id="objectiveList"></ul>
            </div>
        `;
        mainContent.appendChild(introSec);

        const objList = document.getElementById("objectiveList");
        if (objList && Array.isArray(media.learning_objectives)) {
            media.learning_objectives.forEach(obj => {
                const li = document.createElement("li");
                li.innerHTML = formatMarkdownText(obj);
                objList.appendChild(li);
            });
        }

        sections.forEach((sec, idx) => {
            const secDiv = document.createElement("div");
            secDiv.id = `sec-${idx}`;
            secDiv.className = "section-content active"; 
            secDiv.style.display = "block";
            secDiv.style.marginTop = "30px";
            secDiv.innerHTML = `
                <span class="section-tag">${(sec.type || "MATERI").toUpperCase()}</span>
                <h2 class="section-title">${escapeHTML(sec.title || "Materi")}</h2>
                <div class="sec-body"></div>
            `;
            mainContent.appendChild(secDiv);

            const body = secDiv.querySelector(".sec-body");

            if (sec.type === "interactive_conversion") {
                renderInteractiveModuleConverter(body, idx);
            } else {
                const items = Array.isArray(sec.content) ? sec.content : [];
                items.forEach(item => {
                    const p = document.createElement("p");
                    p.className = "content-paragraph";
                    const rawText = typeof item === "string" ? item : (item.content || item.title || "");
                    p.innerHTML = formatMarkdownText(rawText);
                    body.appendChild(p);
                });
            }
        });
    }
}

function switchSection(secId, btn) {
    const target = document.getElementById(secId);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
    if (btn) {
        document.querySelectorAll(".menu-btn").forEach(m => m.classList.remove("active"));
        btn.classList.add("active");
    }
}

/* ==========================================================================
   6. INTERACTIVE CONVERTER ENGINE WITH STEP-BY-STEP EXPLANATION
   ========================================================================== */
function renderInteractiveModuleConverter(container, idx) {
    if (!container) return;
    container.innerHTML = `
        <div class="module-converter">
            <h3><i class="fa-solid fa-calculator"></i> Simulator Konversi Interaktif</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:15px;">
                Masukkan nilai dan pilih basis untuk melihat hasil konversi lengkap beserta penjelasannya.
            </p>
            <div class="quick-converter">
                <div class="input-group">
                    <label>Angka Input</label>
                    <input type="text" id="modInput-${idx}" placeholder="Input angka...">
                </div>
                <div class="input-group">
                    <label>Dari Basis</label>
                    <select id="modFrom-${idx}">
                        <option value="10">Desimal (10)</option>
                        <option value="2">Biner (2)</option>
                        <option value="8">Oktal (8)</option>
                        <option value="16">Heksadesimal (16)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Ke Basis</label>
                    <select id="modTo-${idx}">
                        <option value="2">Biner (2)</option>
                        <option value="8">Oktal (8)</option>
                        <option value="10">Desimal (10)</option>
                        <option value="16">Heksadesimal (16)</option>
                    </select>
                </div>
                <button class="btn btn-accent" onclick="runModuleConvert(${idx})">Konversi</button>
            </div>
            <div id="modResult-${idx}" class="quick-result-box" style="display:none;"></div>
            <div id="modSteps-${idx}" class="steps-breakdown" style="display:none;"></div>
        </div>
    `;
}

function runModuleConvert(idx) {
    const inputElem = document.getElementById(`modInput-${idx}`);
    const fromElem = document.getElementById(`modFrom-${idx}`);
    const toElem = document.getElementById(`modTo-${idx}`);
    const resBox = document.getElementById(`modResult-${idx}`);
    const stepsBox = document.getElementById(`modSteps-${idx}`);

    if (!inputElem || !fromElem || !toElem) return;

    const val = inputElem.value.trim();
    const from = parseInt(fromElem.value, 10);
    const to = parseInt(toElem.value, 10);

    if (!val) {
        resBox.style.display = "block";
        resBox.textContent = "Silakan masukkan angka terlebih dahulu.";
        stepsBox.style.display = "none";
        return;
    }

    const num = parseInt(val, from);
    if (isNaN(num)) {
        resBox.style.display = "block";
        resBox.textContent = "Format angka tidak valid untuk basis yang dipilih!";
        stepsBox.style.display = "none";
        return;
    }

    const result = num.toString(to).toUpperCase();
    resBox.style.display = "block";
    resBox.innerHTML = `Hasil Konversi: <strong>${result}</strong><sub>(${to})</sub>`;

    stepsBox.style.display = "block";
    stepsBox.innerHTML = `
        <strong>Langkah-langkah Penjelasan:</strong><br>
        1. Angka input <strong>${escapeHTML(val)}</strong> (Basis${from}) dikonversi ke Nilai Desimal = <strong>${num}</strong><sub>(10)</sub>.<br>         2. Mengonversi desimal <strong>${num}</strong> ke Basis ${to} menghasilkan <strong>${result}</strong>.
    `;
}

/* ==========================================================================
   7. HELPER UTILS & TEXT FORMATTING
   ========================================================================== */
function showStatus(msg, isError) {
    const status = document.getElementById("processStatus");
    if (status) {
        status.textContent = msg;
        status.style.color = isError ? "var(--rose, #ef4444)" : "var(--emerald, #10b981)";
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    if (typeof str !== "string") str = String(str);
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMarkdownText(text) {
    if (!text) return "";
    let formatted = String(text);

    // 1. Bersihkan tag <code> mentah
    formatted = formatted.replace(/<\/?code.*?>/gi, "");

    // 2. Hapus perintah/fungsi LaTeX umum
    formatted = formatted.replace(/\\text\{([^}]+)\}/gi, "$1");
    formatted = formatted.replace(/\\mathrm\{([^}]+)\}/gi, "$1");
    formatted = formatted.replace(/\\utf8\{([^}]+)\}/gi, "$1");
    formatted = formatted.replace(/\\mathbf\{([^}]+)\}/gi, "$1");
    formatted = formatted.replace(/\\times/gi, "×");
    formatted = formatted.replace(/\\div/gi, "÷");
    formatted = formatted.replace(/\\cdot/gi, "·");

    // 3. Un-wrap isi dari $$...$$ dan $...$
    formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
    formatted = formatted.replace(/\$([^\$]+)\$/g, "$1");
    formatted = formatted.replace(/\$/g, ""); // Sapu bersih sisa dolar jika ada

    // 4. Escape HTML standar
    formatted = escapeHTML(formatted);

    // 5. Bersihkan sisa tag <code> ter-escape
    formatted = formatted.replace(/&lt;\/?code.*?&gt;/gi, "");

    // 6. Format Markdown tebal / backtick
    formatted = formatted.replace(/`([^`]+)`/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return formatted;
}
