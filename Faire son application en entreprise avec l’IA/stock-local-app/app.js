const SAMPLE_ROWS = [
  { produit: "Câble USB-C 1m", categorie: "Accessoire", stock_actuel: 12, stock_minimum: 20, ventes_7_jours: 18, delai_reappro_jours: 5, fournisseur: "Fournisseur A", dernier_reappro: "2026-05-10", commentaire: "ventes rapides" },
  { produit: "Batterie externe 10000mAh", categorie: "Accessoire", stock_actuel: 4, stock_minimum: 10, ventes_7_jours: 7, delai_reappro_jours: 8, fournisseur: "Fournisseur B", dernier_reappro: "2026-05-03", commentaire: "surveiller rupture" },
  { produit: "Coque iPhone 15", categorie: "Protection", stock_actuel: 80, stock_minimum: 25, ventes_7_jours: 3, delai_reappro_jours: 4, fournisseur: "Fournisseur C", dernier_reappro: "2026-05-15", commentaire: "stock dormant" },
  { produit: "Chargeur secteur 30W", categorie: "Accessoire", stock_actuel: 9, stock_minimum: 15, ventes_7_jours: 11, delai_reappro_jours: 6, fournisseur: "Fournisseur A", dernier_reappro: "2026-05-08", commentaire: "réappro à prévoir" },
  { produit: "Écouteurs Bluetooth", categorie: "Audio", stock_actuel: 6, stock_minimum: 12, ventes_7_jours: 9, delai_reappro_jours: 10, fournisseur: "Fournisseur D", dernier_reappro: "2026-04-28", commentaire: "délai fournisseur long" },
  { produit: "Support voiture", categorie: "Accessoire", stock_actuel: 33, stock_minimum: 10, ventes_7_jours: 2, delai_reappro_jours: 5, fournisseur: "Fournisseur B", dernier_reappro: "2026-05-12", commentaire: "rotation faible" },
  { produit: "Film verre trempé", categorie: "Protection", stock_actuel: 18, stock_minimum: 30, ventes_7_jours: 24, delai_reappro_jours: 3, fournisseur: "Fournisseur C", dernier_reappro: "2026-05-18", commentaire: "rupture probable" },
  { produit: "Station d'accueil USB-C", categorie: "Accessoire", stock_actuel: 3, stock_minimum: 8, ventes_7_jours: 6, delai_reappro_jours: 12, fournisseur: "Fournisseur A", dernier_reappro: "2026-04-30", commentaire: "priorité haute" },
  { produit: "Souris ergonomique", categorie: "Bureau", stock_actuel: 22, stock_minimum: 12, ventes_7_jours: 1, delai_reappro_jours: 7, fournisseur: "Fournisseur E", dernier_reappro: "2026-05-01", commentaire: "stock dormant" },
  { produit: "Clavier mécanique", categorie: "Bureau", stock_actuel: 7, stock_minimum: 10, ventes_7_jours: 5, delai_reappro_jours: 9, fournisseur: "Fournisseur E", dernier_reappro: "2026-05-06", commentaire: "à surveiller" }
];

const STATUS_META = {
  "Critique": { className: "critical", color: "#d92945" },
  "Réappro.": { className: "reorder", color: "#ff6b1a" },
  "À surveiller": { className: "watch", color: "#ffc928" },
  "Dormant": { className: "dormant", color: "#8e44ad" },
  "Stable": { className: "stable", color: "#69b943" }
};

let state = {
  rows: [],
  source: "sample",
  fileName: "Données d'exemple",
  sampleDeleted: false,
  filters: {
    search: "",
    category: "Toutes",
    status: "Tous",
    gapOnly: false
  }
};

const els = {
  excelInput: document.querySelector("#excelInput"),
  sourceNotice: document.querySelector("#sourceNotice"),
  rowCountBadge: document.querySelector("#rowCountBadge"),
  sourceBadge: document.querySelector("#sourceBadge"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  gapOnly: document.querySelector("#gapOnly"),
  resetFilters: document.querySelector("#resetFilters"),
  dataFileName: document.querySelector("#dataFileName"),
  dataStorageInfo: document.querySelector("#dataStorageInfo"),
  dataRowCount: document.querySelector("#dataRowCount"),
  dataLocation: document.querySelector("#dataLocation"),
  dataMessage: document.querySelector("#dataMessage"),
  deleteSampleData: document.querySelector("#deleteSampleData"),
  stockTableBody: document.querySelector("#stockTableBody"),
  urgentCards: document.querySelector("#urgentCards"),
  dormantTableBody: document.querySelector("#dormantTableBody"),
  urgentCount: document.querySelector("#urgentCount"),
  dormantCount: document.querySelector("#dormantCount"),
  updatedLabel: document.querySelector("#updatedLabel"),
  kpiProducts: document.querySelector("#kpiProducts"),
  kpiRisk: document.querySelector("#kpiRisk"),
  kpiDormant: document.querySelector("#kpiDormant"),
  kpiUnits: document.querySelector("#kpiUnits"),
  categoryChart: document.querySelector("#categoryChart"),
  statusBars: document.querySelector("#statusBars"),
  actionList: document.querySelector("#actionList"),
  summaryText: document.querySelector("#summaryText")
};

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function pick(row, keys, fallback = "") {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return fallback;
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatDays(days) {
  if (!Number.isFinite(days)) return "∞";
  if (days < 1) return "0 jour";
  return `${Math.round(days)} jours`;
}

function normalizeRows(rows) {
  return rows.map((raw, index) => {
    const row = {};
    Object.entries(raw).forEach(([key, value]) => {
      row[normalizeKey(key)] = value;
    });

    const stock = toNumber(pick(row, ["stock_actuel", "stock", "quantite", "quantite_stock"]));
    const min = toNumber(pick(row, ["stock_minimum", "stock_mini", "seuil_minimum", "seuil_alerte"]));
    const sales7 = toNumber(pick(row, ["ventes_7_jours", "ventes_7j", "ventes_semaine"]));
    const sales30 = toNumber(pick(row, ["ventes_30j", "ventes_30_jours", "ventes_mois"]));
    const lead = toNumber(pick(row, ["delai_reappro_jours", "delai_fournisseur", "delai_jours"], 1));
    const dailySales = sales30 > 0 ? sales30 / 30 : sales7 > 0 ? sales7 / 7 : 0;
    const projected = stock - dailySales * lead;
    const coverageDays = dailySales > 0 ? stock / dailySales : Infinity;
    const comment = String(pick(row, ["commentaire", "notes"], "")).toLowerCase();
    const dormant = sales30 === 0 && sales7 === 0
      ? stock > 0
      : comment.includes("dormant") || comment.includes("rotation faible") || (sales7 <= 2 && stock > min);

    let status = "Stable";
    if (stock <= 0) status = "Critique";
    else if (stock <= min || projected <= 0) status = "Réappro.";
    else if (dormant) status = "Dormant";
    else if (stock <= min * 1.25 || coverageDays <= lead * 2) status = "À surveiller";

    const priority = calculatePriority({ stock, min, dailySales, lead, projected, dormant, status });
    const suggestedQty = Math.max(0, Math.ceil(min + dailySales * Math.max(lead, 7) - stock));

    return {
      id: index + 1,
      reference: String(pick(row, ["reference", "ref", "sku"], `REF-${String(index + 1).padStart(4, "0")}`)),
      product: String(pick(row, ["produit", "nom_produit", "article", "designation"], `Produit ${index + 1}`)),
      category: String(pick(row, ["categorie", "famille"], "Non classé")),
      supplier: String(pick(row, ["fournisseur"], "")),
      stock,
      min,
      sales: sales30 > 0 ? sales30 : sales7,
      salesLabel: sales30 > 0 ? "30j" : "7j",
      lead: lead || 1,
      dailySales,
      projected,
      coverageDays,
      dormant,
      status,
      priority,
      suggestedQty,
      comment: String(pick(row, ["commentaire", "notes"], ""))
    };
  });
}

function calculatePriority(item) {
  let score = 0;
  if (item.status === "Critique") score += 45;
  if (item.status === "Réappro.") score += 34;
  if (item.projected <= 0) score += 24;
  if (item.min > 0 && item.stock < item.min) score += Math.min(22, ((item.min - item.stock) / item.min) * 22);
  score += Math.min(18, item.dailySales * 5);
  score += Math.min(12, item.lead);
  if (item.dormant) score -= 18;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function filteredRows() {
  const search = state.filters.search.trim().toLowerCase();
  return state.rows.filter((row) => {
    const matchesSearch = !search || [row.product, row.reference, row.category, row.supplier]
      .join(" ")
      .toLowerCase()
      .includes(search);
    const matchesCategory = state.filters.category === "Toutes" || row.category === state.filters.category;
    const matchesStatus = state.filters.status === "Tous" || row.status === state.filters.status;
    const matchesGap = !state.filters.gapOnly || row.status !== "Stable";
    return matchesSearch && matchesCategory && matchesStatus && matchesGap;
  });
}

function statusPill(status) {
  const meta = STATUS_META[status] || STATUS_META.Stable;
  return `<span class="status-pill ${meta.className}">${status}</span>`;
}

function renderFilters() {
  const categories = ["Toutes", ...new Set(state.rows.map((row) => row.category).sort())];
  const statuses = ["Tous", ...Object.keys(STATUS_META)];
  els.categoryFilter.innerHTML = categories.map((category) => `<option ${category === state.filters.category ? "selected" : ""}>${category}</option>`).join("");
  els.statusFilter.innerHTML = statuses.map((status) => `<option ${status === state.filters.status ? "selected" : ""}>${status}</option>`).join("");
}

function renderStockTable() {
  const rows = filteredRows();
  els.rowCountBadge.textContent = `${rows.length} produits`;
  if (!rows.length) {
    els.stockTableBody.innerHTML = `<tr><td colspan="8" class="empty-state">Aucun produit ne correspond aux filtres.</td></tr>`;
    return;
  }

  els.stockTableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.reference)}</td>
      <td><strong>${escapeHtml(row.product)}</strong></td>
      <td>${escapeHtml(row.category)}</td>
      <td>${formatNumber(row.stock)}</td>
      <td>${formatNumber(row.min)}</td>
      <td>${formatNumber(row.sales)} ${row.salesLabel}</td>
      <td>${formatDays(row.coverageDays)}</td>
      <td>${statusPill(row.status)}</td>
    </tr>
  `).join("");
}

function renderDataPanel() {
  els.dataFileName.textContent = state.fileName;
  els.dataRowCount.textContent = formatNumber(state.rows.length);
  els.dataLocation.textContent = "Mémoire";

  if (state.source === "excel") {
    els.dataStorageInfo.textContent = "Les données importées sont lues en mémoire dans le navigateur. Elles ne sont pas écrites dans un fichier ni dans une base locale.";
  } else if (state.source === "empty") {
    els.dataStorageInfo.textContent = "Aucune donnée n'est chargée. Les données de test ont été retirées de la mémoire du navigateur.";
  } else {
    els.dataStorageInfo.textContent = "Les données de test sont uniquement en mémoire dans le navigateur. Aucun fichier et aucune base locale ne sont créés.";
  }
}

function renderAlerts() {
  const urgent = [...state.rows]
    .filter((row) => ["Critique", "Réappro.", "À surveiller"].includes(row.status))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);
  const dormant = [...state.rows]
    .filter((row) => row.status === "Dormant" || row.dormant)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 8);

  els.urgentCount.textContent = `${urgent.length} références`;
  els.dormantCount.textContent = `${dormant.length} références`;
  els.updatedLabel.textContent = `Dernière mise à jour : ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  els.urgentCards.innerHTML = urgent.length ? urgent.map((row) => `
    <article class="priority-card">
      <div class="priority-card-top">
        <div>
          <strong>${escapeHtml(row.product)}</strong>
          <small>Réf. ${escapeHtml(row.reference)}</small>
        </div>
        ${statusPill(row.status)}
      </div>
      <small>Catégorie ${escapeHtml(row.category)}</small>
      <div class="priority-metrics">
        <div class="metric"><span>Priorité</span><strong>${row.priority}</strong></div>
        <div class="metric"><span>Qté conseillée</span><strong>${row.suggestedQty}</strong></div>
        <div class="metric"><span>Délai</span><strong>${row.lead}j</strong></div>
      </div>
    </article>
  `).join("") : `<div class="empty-state">Aucune alerte de réapprovisionnement.</div>`;

  els.dormantTableBody.innerHTML = dormant.length ? dormant.map((row) => `
    <tr>
      <td>${escapeHtml(row.product)}</td>
      <td>${escapeHtml(row.reference)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${formatNumber(row.sales)} ${row.salesLabel}</td>
      <td>${formatNumber(row.stock)}</td>
      <td>${statusPill("Dormant")}</td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty-state">Aucun stock dormant détecté.</td></tr>`;
}

function renderSummary() {
  const total = state.rows.length;
  const risk = state.rows.filter((row) => ["Critique", "Réappro."].includes(row.status)).length;
  const dormant = state.rows.filter((row) => row.status === "Dormant" || row.dormant).length;
  const units = state.rows.reduce((sum, row) => sum + row.stock, 0);

  els.kpiProducts.textContent = formatNumber(total);
  els.kpiRisk.textContent = formatNumber(risk);
  els.kpiDormant.textContent = formatNumber(dormant);
  els.kpiUnits.textContent = formatNumber(units);
  els.sourceBadge.textContent = state.source === "sample" ? "Mode exemple" : "Excel importé";

  renderCategoryChart();
  renderStatusChart();
  renderActions();

  const topCategory = topEntry(groupSum(state.rows, "category", "stock"))?.[0] || "non identifiée";
  els.summaryText.textContent = `Le stock contient ${formatNumber(total)} produits. ${formatNumber(risk)} références demandent une attention de réapprovisionnement et ${formatNumber(dormant)} semblent dormantes. La catégorie la plus présente en volume est ${topCategory}.`;
}

function renderCategoryChart() {
  const grouped = groupSum(state.rows, "category", "stock");
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  els.categoryChart.innerHTML = entries.length ? entries.map(([label, value]) => `
    <div class="bar-row">
      <span>${escapeHtml(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (value / max) * 100)}%"></div></div>
      <strong>${formatNumber(value)}</strong>
    </div>
  `).join("") : `<div class="empty-state">Aucune donnée à afficher.</div>`;
}

function renderStatusChart() {
  const counts = Object.fromEntries(Object.keys(STATUS_META).map((status) => [status, 0]));
  state.rows.forEach((row) => { counts[row.status] = (counts[row.status] || 0) + 1; });
  const max = Math.max(1, ...Object.values(counts));

  els.statusBars.innerHTML = Object.entries(counts)
    .map(([status, count]) => {
      const meta = STATUS_META[status];
      const width = count > 0 ? Math.max(4, (count / max) * 100) : 0;
      return `
        <div class="status-bar-row">
          <div class="status-bar-label">
            <span class="status-bar-dot" style="background:${meta.color}"></span>
            <span>${status}</span>
          </div>
          <div class="status-bar-track">
            <div class="status-bar-fill" style="--bar-color:${meta.color}; width:${width}%"></div>
          </div>
          <strong class="status-bar-value">${formatNumber(count)}</strong>
        </div>
    `;
    }).join("");
}

function renderActions() {
  const urgent = state.rows.filter((row) => ["Critique", "Réappro."].includes(row.status)).length;
  const dormant = state.rows.filter((row) => row.status === "Dormant" || row.dormant).length;
  const watch = state.rows.filter((row) => row.status === "À surveiller").length;
  const topUrgent = [...state.rows].sort((a, b) => b.priority - a.priority)[0];
  const actions = [
    urgent ? `Réapprovisionner ${urgent} référence${urgent > 1 ? "s" : ""} critique${urgent > 1 ? "s" : ""}.` : "Aucune rupture probable immédiate.",
    dormant ? `Examiner ${dormant} stock${dormant > 1 ? "s" : ""} dormant${dormant > 1 ? "s" : ""}.` : "Aucun stock dormant notable.",
    watch ? `Surveiller ${watch} référence${watch > 1 ? "s" : ""} proche${watch > 1 ? "s" : ""} du seuil.` : "Les autres références restent stables.",
    topUrgent ? `Priorité la plus haute : ${topUrgent.product}.` : "Importez un fichier pour calculer les priorités."
  ];

  els.actionList.innerHTML = actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
}

function groupSum(rows, key, valueKey) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + toNumber(row[valueKey]);
    return acc;
  }, {});
}

function topEntry(grouped) {
  return Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
}

function renderAll() {
  renderDataPanel();
  renderFilters();
  renderStockTable();
  renderAlerts();
  renderSummary();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setPage(page) {
  document.querySelectorAll(".page").forEach((el) => el.classList.toggle("active", el.id === `page-${page}`));
  document.querySelectorAll("[data-page]").forEach((el) => el.classList.toggle("active", el.dataset.page === page));
}

function loadWorkbook(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(event.target.result, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      state.rows = normalizeRows(rows);
      state.source = "excel";
      state.fileName = file.name;
      state.filters = { search: "", category: "Toutes", status: "Tous", gapOnly: false };
      els.searchInput.value = "";
      els.gapOnly.checked = false;
      els.sourceNotice.textContent = `Fichier importé : ${file.name}. Le fichier original n'a pas été modifié.`;
      els.sourceNotice.classList.add("loaded");
      showDataMessage(`Fichier importé : ${file.name}. ${rows.length} lignes chargées en mémoire. Le fichier Excel original reste intact.`, true);
      renderAll();
    } catch (error) {
      els.sourceNotice.textContent = `Import impossible : ${error.message}`;
      els.sourceNotice.classList.remove("loaded");
    }
  };
  reader.readAsArrayBuffer(file);
}

function showDataMessage(message, positive = false) {
  els.dataMessage.hidden = false;
  els.dataMessage.textContent = message;
  els.dataMessage.classList.toggle("loaded", positive);
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => setPage(button.dataset.page));
});

els.excelInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) loadWorkbook(file);
});

els.searchInput.addEventListener("input", (event) => {
  state.filters.search = event.target.value;
  renderStockTable();
});

els.categoryFilter.addEventListener("change", (event) => {
  state.filters.category = event.target.value;
  renderStockTable();
});

els.statusFilter.addEventListener("change", (event) => {
  state.filters.status = event.target.value;
  renderStockTable();
});

els.gapOnly.addEventListener("change", (event) => {
  state.filters.gapOnly = event.target.checked;
  renderStockTable();
});

els.resetFilters.addEventListener("click", () => {
  state.filters = { search: "", category: "Toutes", status: "Tous", gapOnly: false };
  els.searchInput.value = "";
  els.gapOnly.checked = false;
  renderAll();
});

els.deleteSampleData.addEventListener("click", () => {
  if (state.source === "sample") {
    state.rows = [];
    state.source = "empty";
    state.fileName = "Aucune donnée chargée";
    state.sampleDeleted = true;
    state.filters = { search: "", category: "Toutes", status: "Tous", gapOnly: false };
    els.searchInput.value = "";
    els.gapOnly.checked = false;
    els.sourceNotice.textContent = "Les données de test ont été supprimées de l'application. Aucun fichier Excel original n'a été supprimé.";
    els.sourceNotice.classList.add("loaded");
    showDataMessage("Données de test supprimées. L'application est vide jusqu'au prochain import Excel.", true);
  } else if (state.source === "excel") {
    showDataMessage("Les données de test ne sont plus actives : elles ont été remplacées par votre import Excel. Le fichier original n'est jamais supprimé.", true);
  } else {
    showDataMessage("Aucune donnée de test à supprimer. L'application est déjà vide.", true);
  }
  renderAll();
});

state.rows = normalizeRows(SAMPLE_ROWS);
renderAll();
