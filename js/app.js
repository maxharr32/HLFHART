/* ============================================================
   HLFHART gallery engine
   ============================================================ */

(function () {
  "use strict";

  // Category -> vibrant gradient used for placeholder thumbnails
  const GRADIENTS = {
    "biro portraits": "linear-gradient(135deg,#8b5cf6 0%,#d63384 60%,#ff6a33 100%)",
    "acrylic":        "linear-gradient(135deg,#00b4d8 0%,#1d5cff 60%,#27ae60 100%)",
    "postcards":      "linear-gradient(135deg,#ffb020 0%,#ff6a33 60%,#d63384 100%)",
    "life drawing":   "linear-gradient(135deg,#d63384 0%,#ff6a33 60%,#00b4d8 100%)",
    "collage":        "linear-gradient(135deg,#ff6a33 0%,#f2a65a 60%,#8b5cf6 100%)",
    "sculpture":      "linear-gradient(135deg,#27ae60 0%,#4a6fa5 60%,#27ae60 100%)"
  };

  const categories = ["biro portraits", "acrylic", "postcards", "life drawing", "collage", "sculpture"];

  function loadData() {
    return fetch("data/art.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("data/art.json not found (" + r.status + ")"); return r.json(); })
      .catch(function () {
        // Fallback placeholder dataset — so the grid is alive from day one
        return Promise.resolve(FALLBACK_DATA);
      });
  }

  const FALLBACK_DATA = {
    items: [
      { id: "fl-001", title: "Bloom (biro portraits)", category: "biro portraits", date: "2026-05", description: "A six-figure ink study of a wildflower, every petal built from thousands of fine pen strokes." },
      { id: "fl-002", title: "Sea-Serpent (acrylic)", category: "acrylic", date: "2026-06", description: "Layered washes of teal and copper that suggest a creature moving under water." },
      { id: "fl-003", title: "Bright Side (postcards)", category: "postcards", date: "2026-04", description: "Four small colour studies on postcard paper, all about sun hitting a wall." },
      { id: "fl-004", title: "Gesture (life drawing)", category: "life drawing", date: "2026-07", description: "A series of timed charcoal and ink studies capturing posture and breath." },
      { id: "fl-005", title: "Found (collage)", category: "collage", date: "2026-05", description: "Assembled from torn maps and ticket stubs — memory you can hold." },
      { id: "fl-006", title: "Form (sculpture)", category: "sculpture", date: "2026-08", description: "A small suspended bronze relief — line, weight and space in three dimensions." }
    ]
  };

  function catClass(c) {
    const m = { "biro portraits": "biro portraits", "acrylic": "acrylic", "postcards": "postcards", "life drawing": "life drawing", "collage": "collage", "sculpture": "sculpture" };
    return m[c] || c;
  }

  function render(items) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    items.forEach(function (it, i) {
      const card = document.createElement("article");
      card.className = "art-card reveal " + (i % 2 === 0 ? "fast" : "");
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "listitem");

      const gradient = GRADIENTS[it.category] || GRADIENTS["biro portraits"];
      card.innerHTML =
        `<div class="thumb" style="background:${gradient}">` +
          `<span class="chip">${escapeHtml(it.category)}</span>` +
        `</div>` +
        `<div class="cap">` +
          `<div class="title">${escapeHtml(it.title)}</div>` +
          `<div class="desc">${escapeHtml(it.description)}</div>` +
          `<div class="meta">${formatDate(it.date)}</div>` +
        `</div>`;

      card.addEventListener("click", function () { openLightbox(it); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(it); }
      });
      grid.appendChild(card);
    });
    document.getElementById("count").textContent = items.length + " pieces";
  }

  function formatDate(d) {
    if (!d) return "";
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dt = d.split("-");
    if (dt.length === 2) return m[parseInt(dt[1],10)-1] + " " + (2026);
    if (dt.length === 3) return m[parseInt(dt[1],10)-1] + " " + dt[2];
    return d;
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  // ---- filter ----
  const filterBar = document.getElementById("filterBar");
  filterBar.addEventListener("click", function (e) {
    const b = e.target.closest(".btn");
    if (!b) return;
    document.querySelectorAll(".filter-bar .btn").forEach(function (x) { x.classList.remove("active"); });
    b.classList.add("active");
    const f = b.dataset.filter;
    const items = allItems;
    const shown = f === "all" ? items : items.filter(function (x) { return x.category === f; });
    render(shown);
  });

  // ---- lightbox ----
  const overlay = document.getElementById("overlay");
  const bigImg = document.getElementById("bigImg");
  const lbCat = document.getElementById("lbCat");
  const lbTitle = document.getElementById("lbTitle");
  const lbDate = document.getElementById("lbDate");
  const lbDesc = document.getElementById("lbDesc");
  const closeBtn = document.getElementById("closeBtn");
  let idx = 0;

  function openLightbox(it) {
    bigImg.src = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000' width='800' height='1000'>` +
      `<defs><radialGradient id='g' cx='50%'${' cx="50%"' } cy='50%' r='70%'>` +
      `<stop offset='0%' stop-color='#${getCatLight(it.category)}' />` +
      `<stop offset='100%' stop-color='#${getCatDeep(it.category)}' />` +
      `</radialGradient></defs>` +
      `<rect width='800' height='1000' rx='16' fill='url(#g)'/>` +
      `<text x='50%' y='50%' font-family='sans-serif' font-size='64' font-weight='bold' fill='#fff' text-anchor='middle' dominant-baseline='middle' opacity='.92'>${escapeHtml(it.title)}</text>` +
      `</svg>`
    );
    lbCat.textContent = it.category;
    lbTitle.textContent = it.title;
    lbDate.textContent = formatDate(it.date);
    lbDesc.textContent = it.description;
    idx = 0;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function getCatLight(c) {
    const m = { "biro portraits": "8b5cf6", "acrylic": "00b4d8", "postcards": "ff6a33", "life drawing": "d63384", "collage": "ffb020", "sculpture": "27ae60" };
    return m[c] || "8b5cf6";
  }
  function getCatDeep(c) {
    const m = { "biro portraits": "6d3bb0", "acrylic": "1d5cff", "postcards": "d63384", "life drawing": "b12a6f", "collage": "c7408c", "sculpture": "1e6f3f" };
    return m[c] || "6d3bb0";
  }

  closeBtn.addEventListener("click", closeLightbox);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  // ---- scroll reveal ----
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // ---- year ----
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---- boot ----
  let allItems = [];
  loadData().then(function (data) {
    allItems = data.items || [];
    render(allItems);
  });
})();
