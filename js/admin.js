/* ============================================================
   HLFHART upload form
   Works with scripts/serve.py (local backend) to add a piece:
   - drag a picture into the box
   - fill title / category / description / date
   - POST -> server moves file into art/<category>/ and appends
     a line to data/art.json, then prints the git commands to run
   ============================================================ */

(function () {
  "use strict";

  var form = document.getElementById("uploadForm");
  var fileInput = document.getElementById("file");
  var fileZone = document.getElementById("fileZone");
  var fileName = document.getElementById("fileName");
  var zoneHint = document.getElementById("zoneHint");
  var submitBtn = document.getElementById("submitBtn");
  var cancelBtn = document.getElementById("cancelBtn");
  var success = document.getElementById("success");
  var offlineNote = document.getElementById("offlineNote");
  var offlineCmd = document.getElementById("offlineCmd");

  var FALLBACK_DIR = "https://hlfhart.github.io/HLFHART/"; // for GitHub Pages live preview

  // ---- drag & drop ----
  fileZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    fileZone.classList.add("drag");
  });
  fileZone.addEventListener("dragleave", function (e) { fileZone.classList.remove("drag"); });
  fileZone.addEventListener("drop", function (e) {
    e.preventDefault();
    fileZone.classList.remove("drag");
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) pickFile(f);
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) pickFile(fileInput.files[0]);
  });

  function pickFile(file) {
    if (!file) return;
    fileName.textContent = file.name;
    fileName.style.display = "block";
    zoneHint.style.display = "none";
   submitBtn.disabled = false;
  }

  // ---- submit ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    var title = document.getElementById("title").value.trim();
    var category = document.getElementById("category").value;
    var description = document.getElementById("description").value.trim();
    var date = document.getElementById("date").value;
    var file = fileInput.files && fileInput.files[0];
    if (!file) { alert("Please drop an image first."); return; }

    // Build the JSON body (server does the real work)
    var reader = new FileReader();
    reader.onload = function () {
      var body = {
        title: title,
        category: category,
        description: description,
        date: date,
        filename: file.name,
        file_b64: reader.result.split(",")[1]
      };

      var isGitHubPages = (typeof location !== "undefined" && location.hostname === "hlfhart.github.io");

      fetch("api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
      .then(function (res) {
        if (res.ok) {
          showSuccess(res.data);
          form.reset();
          fileName.style.display = "none";
          zoneHint.style.display = "block";
          submitBtn.disabled = false;
          cancelBtn.style.display = "none";
        } else {
          alert("Something went wrong: " + (res.data.error || "unknown"));
        }
      })
      .catch(function () {
        // If there's no local server, give the user a clean fallback
        showFallback(body, file);
      });
    };
    reader.readAsDataURL(file);
  });

  function showSuccess(data) {
    var html = "<p style='margin:0 0 10px;font-weight:700;color:#1d6b32;'>Added! Here's what to do next:</p>";
    html += `<div class="command">${escapeHtml(data.command)}</div>`;
    html += `<p class="muted small" style="margin:10px 0 0;">Copy-paste those commands into Terminal (one at a time) to save the piece to GitHub Pages.</p>`;
    success.className = "success show";
    success.innerHTML = html;
    submitBtn.disabled = true;
    cancelBtn.style.display = "inline-block";
  }

  function showFallback(body, file) {
    // No local server running -> explain, give a ready manifest JSON to merge
    var manifest = {
      title: body.title,
      category: body.category,
      description: body.description,
      date: body.date,
      filename: body.filename
    };
    var blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "new-piece.json";
    a.click();
    URL.revokeObjectURL(a.href);
    success.className = "success show";
    success.innerHTML =
      "<p style='margin:0 0 10px;font-weight:700;color:#1d6b32;'>No local server detected.</p>" +
      `<div class="command">python3 scripts/upload_art.py --file "${file.name}" --title "${body.title}" --category "${body.category}" --desc "${body.description}" --date "${body.date || ""}"</div>` +
      `<p class="muted small" style="margin:10px 0 0;">Or run <code>python3 scripts/serve.py</code> in Terminal to use the full form.</p>`;
    submitBtn.disabled = false;
    cancelBtn.style.display = "inline-block";
  }

  document.getElementById("cancelBtn").addEventListener("click", function () {
    success.className = "success";
    success.innerHTML = "";
    submitBtn.disabled = false;
    cancelBtn.style.display = "none";
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  // Infer whether a local server is running
  var host = location.hostname;
  offlineNote.style.display = (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".ngrok.io") || host.endsWith(".vercel.app") || host.endsWith(".now.sh") || (host.length <= 4 && /^\d/.test(host))) ? "none" : "block";
})();
