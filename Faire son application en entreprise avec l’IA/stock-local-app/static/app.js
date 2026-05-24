const state = {
  products: [],
  priorities: [],
  summary: null,
  filters: {
    search: "",
    category: "",
    status: "",
    coverage: "",
  },
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  notice: document.querySelector("#notice"),
  stockRows: document.querySelector("#stockRows"),
  stockCount: document.querySelector("#stockCount"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  coverageFilter: document.querySelector("#coverageFilter"),
  resetFilters: document.querySelector("#resetFilters"),
  priorityCount: document.querySelector("#priorityCount"),
  priorityList: document.querySelector("#priorityList"),
  dormantList: document.querySelector("#dormantList"),
  kpiProducts: document.querySelector("#kpiProducts"),
  kpiShortage: document.querySelector("#kpiShortage"),
  kpiDormant: document.querySelector("#kpiDormant"),
  kpiCoverage: document.querySelector("#kpiCoverage"),
  summaryDate: document.querySelector("#summaryDate"),
  categoryChart: document.querySelector("#categoryChart"),
  statusChart: document.querySelector("#statusChart"),
  takeaways: document.querySelector("#takeaways"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(value ?? 0);
}

function coverageLabel(value) {
  if (value === null || value === undefined) return "Non calculée";
  if (value <= 1) return `${value.toFixed(1).replace(".", ",")} jour`;
  return `${value.toFixed(1).replace(".", ",")} jours`;
}

function badgeClass(status) {
  return {
    Urgent: "urgent",
    Réappro: "restock",
    "A surveiller": "watch",
    "Stock dormant": "dormant",
    Stable: "stable",
  }[status] || "stable";
}

function filteredProducts() {
  const search = state.filters.search.trim().toLowerCase();
  return state.products.filter((product) => {
    const haystack = [
      product.reference,
      product.produit,
      product.categorie,
      product.fournisseur,
      product.commentaire,
    ]
      .join(" ")
      .toLowerCase();

    if (search && !haystack.includes(search)) return false;
    if (state.filters.category && product.categorie !== state.filters.category) return false;
    if (state.filters.status && product.priorite !== state.filters.status) return false;
    if (state.filters.coverage === "low" && !(product.couverture_jours !== null && product.couverture_jours <= 7)) return false;
    if (state.filters.coverage === "watch" && !(product.couverture_jours !== null && product.couverture_jours <= 30)) return false;
    if (state.filters.coverage === "wide" && !(product.couverture_jours === null || product.couverture_jours > 30)) return false;
    return true;
  });
}

function renderCategories() {
  const categories = [...new Set(state.products.map((product) => product.categorie).filter(Boolean))].sort();
  els.categoryFilter.innerHTML = '<option value="">Toutes</option>';
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.append(option);
  }
}

function renderStockTable() {
  const rows = filteredProducts();
  els.stockCount.textContent = rows.length
    ? `${rows.length} produit${rows.length > 1 ? "s" : ""} affiché${rows.length > 1 ? "s" : ""}`
    : "Aucun produit affiché";

  if (!rows.length) {
    els.stockRows.innerHTML = '<tr><td class="empty" colspan="8">Importez un fichier Excel ou ajustez les filtres.</td></tr>';
    return;
  }

  els.stockRows.innerHTML = rows
    .map(
      (product) => `
        <tr>
          <td>${escapeHtml(product.reference)}</td>
          <td>
            <strong>${escapeHtml(product.produit)}</strong>
            <div class="muted">${escapeHtml(product.fournisseur)}</div>
          </td>
          <td>${escapeHtml(product.categorie)}</td>
          <td>${formatNumber(product.stock_actuel)}</td>
          <td>${formatNumber(product.stock_minimum)}</td>
          <td>${formatNumber(product.ventes_7_jours)}</td>
          <td>${coverageLabel(product.couverture_jours)}</td>
          <td><span class="badge ${badgeClass(product.priorite)}">${escapeHtml(product.priorite)}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderPriorityCards() {
  els.priorityCount.textContent = `${state.priorities.length} priorité${state.priorities.length > 1 ? "s" : ""}`;

  if (!state.priorities.length) {
    els.priorityList.innerHTML = '<p class="empty">Aucun réapprovisionnement urgent détecté.</p>';
    return;
  }

  els.priorityList.innerHTML = state.priorities
    .slice(0, 8)
    .map(
      (product) => `
        <article class="priority-card">
          <div>
            <span class="badge ${badgeClass(product.priorite)}">${escapeHtml(product.priorite)}</span>
            <h3>${escapeHtml(product.produit)}</h3>
            <p class="muted">${escapeHtml(product.reference)} · ${escapeHtml(product.categorie)}</p>
          </div>
          <div class="score-row">
            <div><strong>${product.score_priorite}</strong><span>Priorité</span></div>
            <div><strong>${formatNumber(product.quantite_reappro)}</strong><span>Qté conseillée</span></div>
            <div><strong>${product.delai_reappro_jours} j</strong><span>Délai</span></div>
          </div>
          <p class="muted">Stock actuel ${formatNumber(product.stock_actuel)} / minimum ${formatNumber(product.stock_minimum)}.</p>
        </article>
      `
    )
    .join("");
}

function renderDormantStocks() {
  const dormant = state.products.filter((product) => product.stock_dormant);
  if (!dormant.length) {
    els.dormantList.innerHTML = '<p class="empty">Aucun stock dormant probable détecté avec les règles actuelles.</p>';
    return;
  }

  els.dormantList.innerHTML = dormant
    .map(
      (product) => `
        <div class="dormant-row">
          <strong>${escapeHtml(product.produit)}</strong>
          <span>${escapeHtml(product.reference)}</span>
          <span>${escapeHtml(product.categorie)}</span>
          <span>${formatNumber(product.stock_actuel)} unités</span>
          <span class="badge dormant">Stock dormant</span>
        </div>
      `
    )
    .join("");
}

function renderKpis() {
  const summary = state.summary || {};
  els.kpiProducts.textContent = formatNumber(summary.total_produits);
  els.kpiShortage.textContent = formatNumber(summary.ruptures_probables);
  els.kpiDormant.textContent = formatNumber(summary.stocks_dormants);
  els.kpiCoverage.textContent = summary.couverture_moyenne ? `${summary.couverture_moyenne.toString().replace(".", ",")} j` : "-";
  els.summaryDate.textContent = state.products.length
    ? `Synthèse générée localement le ${new Date().toLocaleDateString("fr-FR")}`
    : "Après import Excel";
}

function renderCategoryChart() {
  const categories = state.summary?.categories || [];
  if (!categories.length) {
    els.categoryChart.innerHTML = '<p class="empty">Importez un fichier pour afficher les catégories.</p>';
    return;
  }

  const max = Math.max(...categories.map((category) => category.produits), 1);
  els.categoryChart.innerHTML = categories
    .map(
      (category) => `
        <div class="bar-row">
          <span>${escapeHtml(category.categorie)}</span>
          <div class="bar"><span style="width: ${(category.produits / max) * 100}%"></span></div>
          <strong>${category.alertes}/${category.produits}</strong>
        </div>
      `
    )
    .join("");
}

function renderStatusChart() {
  if (!state.products.length) {
    els.statusChart.innerHTML = `
      <div class="status-bars is-empty">
        <div class="status-bar-row">
          <span>Urgent</span>
          <div class="status-track"><i style="width: 72%"></i></div>
          <strong>-</strong>
        </div>
        <div class="status-bar-row">
          <span>Réappro</span>
          <div class="status-track"><i style="width: 55%"></i></div>
          <strong>-</strong>
        </div>
        <div class="status-bar-row">
          <span>À surveiller</span>
          <div class="status-track"><i style="width: 42%"></i></div>
          <strong>-</strong>
        </div>
        <div class="status-bar-row">
          <span>Stock dormant</span>
          <div class="status-track"><i style="width: 28%"></i></div>
          <strong>-</strong>
        </div>
        <p class="empty">Importez un fichier pour afficher l'histogramme des statuts.</p>
      </div>
    `;
    return;
  }

  const order = ["Urgent", "Réappro", "A surveiller", "Stock dormant", "Stable"];
  const colors = {
    Urgent: "#ff3f46",
    Réappro: "#ff6a00",
    "A surveiller": "#ffc42b",
    "Stock dormant": "#8d45d6",
    Stable: "#80d64a",
  };
  const counts = Object.fromEntries(order.map((status) => [status, 0]));
  for (const product of state.products) counts[product.priorite] = (counts[product.priorite] || 0) + 1;

  const max = Math.max(...order.map((status) => counts[status]), 1);

  els.statusChart.innerHTML = `
    <div class="status-bars">
      ${order
        .map(
          (status) => `
            <div class="status-bar-row" style="--bar-color: ${colors[status]}">
              <span>${escapeHtml(status)}</span>
              <div class="status-track">
                <i style="width: ${Math.max((counts[status] / max) * 100, counts[status] ? 8 : 0)}%"></i>
              </div>
              <strong>${formatNumber(counts[status])}</strong>
            </div>
          `
        )
        .join("")}
      <div class="status-total">${formatNumber(state.products.length)} produits analysés</div>
    </div>
  `;
}

function renderTakeaways() {
  if (!state.summary) {
    els.takeaways.innerHTML = '<li>Importez le fichier Excel pour générer la synthèse.</li>';
    return;
  }

  const topCategory = [...state.summary.categories].sort((a, b) => b.alertes - a.alertes)[0];
  const takeaways = [
    `Réapprovisionner ${formatNumber(state.summary.reappro_total)} unité${state.summary.reappro_total > 1 ? "s" : ""} sur les références prioritaires.`,
    `Surveiller ${formatNumber(state.summary.ruptures_probables)} rupture${state.summary.ruptures_probables > 1 ? "s" : ""} probable${state.summary.ruptures_probables > 1 ? "s" : ""}.`,
    `Identifier une action commerciale ou d’écoulement pour ${formatNumber(state.summary.stocks_dormants)} stock${state.summary.stocks_dormants > 1 ? "s" : ""} dormant${state.summary.stocks_dormants > 1 ? "s" : ""}.`,
    topCategory ? `Catégorie la plus exposée : ${topCategory.categorie}, avec ${topCategory.alertes} alerte${topCategory.alertes > 1 ? "s" : ""}.` : "Aucune catégorie exposée.",
  ];

  els.takeaways.innerHTML = takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderAll() {
  renderCategories();
  renderStockTable();
  renderPriorityCards();
  renderDormantStocks();
  renderKpis();
  renderCategoryChart();
  renderStatusChart();
  renderTakeaways();
}

async function analyzeFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  els.notice.textContent = "Analyse locale du fichier en cours...";

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Impossible d’analyser ce fichier.");
  }

  state.products = payload.products;
  state.priorities = payload.priorities;
  state.summary = payload.summary;
  els.notice.innerHTML = `<strong>${escapeHtml(file.name)}</strong> importé : ${formatNumber(state.products.length)} produits analysés localement.`;
  renderAll();
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;
    document.querySelectorAll(".page").forEach((section) => section.classList.toggle("active", section.id === page));
    document.querySelectorAll(".tab, .side-link").forEach((item) => item.classList.toggle("active", item.dataset.page === page));
  });
});

els.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    await analyzeFile(file);
  } catch (error) {
    els.notice.textContent = error.message;
  }
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

els.coverageFilter.addEventListener("change", (event) => {
  state.filters.coverage = event.target.value;
  renderStockTable();
});

els.resetFilters.addEventListener("click", () => {
  state.filters = { search: "", category: "", status: "", coverage: "" };
  els.searchInput.value = "";
  els.categoryFilter.value = "";
  els.statusFilter.value = "";
  els.coverageFilter.value = "";
  renderStockTable();
});

renderAll();
