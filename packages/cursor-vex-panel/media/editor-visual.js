(function () {
  const vscode = acquireVsCodeApi();

  let selectedTabIndex = 0;
  let lastDescribeCount = 0;
  let lastDocument = null;

  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 1.15;

  let panTx = 0;
  let panTy = 0;
  let zoom = 1;
  let panDragging = false;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginTx = 0;
  let panOriginTy = 0;

  let hasDoneInitialViewportReset = false;

  const viewportEl = document.getElementById("vex-ed-viewport");
  const panEl = document.getElementById("vex-ed-pan");
  const contentEl = document.getElementById("vex-ed-content");

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function applyPanZoom() {
    if (!panEl) {
      return;
    }
    panEl.style.transform = "translate(" + String(panTx) + "px, " + String(panTy) + "px) scale(" + String(zoom) + ")";
  }

  function updateZoomLabel() {
    const el = document.getElementById("vex-ed-zoom-pct");
    if (!el) {
      return;
    }
    el.textContent = String(Math.round(zoom * 100)) + "%";
  }

  function clampZoom(value) {
    if (value < ZOOM_MIN) {
      return ZOOM_MIN;
    }
    if (value > ZOOM_MAX) {
      return ZOOM_MAX;
    }
    return value;
  }

  function resetView() {
    panTx = 0;
    panTy = 0;
    zoom = 1;
    applyPanZoom();
    updateZoomLabel();
  }

  function zoomByFactor(factor) {
    const next = clampZoom(zoom * factor);
    if (next === zoom) {
      return;
    }
    zoom = next;
    applyPanZoom();
    updateZoomLabel();
  }

  function setupPan() {
    if (!viewportEl || !panEl) {
      return;
    }

    viewportEl.addEventListener(
      "wheel",
      function onWheel(e) {
        if (!e.ctrlKey && !e.metaKey) {
          return;
        }
        e.preventDefault();
        const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        zoomByFactor(factor);
      },
      { passive: false },
    );

    viewportEl.onpointerdown = function (e) {
      if (e.button !== 0) {
        return;
      }
      panDragging = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panOriginTx = panTx;
      panOriginTy = panTy;
      viewportEl.setPointerCapture(e.pointerId);
      viewportEl.classList.add("vex-ed-viewport--dragging");
    };

    viewportEl.onpointermove = function (e) {
      if (!panDragging) {
        return;
      }
      panTx = panOriginTx + (e.clientX - panStartX);
      panTy = panOriginTy + (e.clientY - panStartY);
      applyPanZoom();
    };

    viewportEl.onpointerup = function (e) {
      panDragging = false;
      viewportEl.classList.remove("vex-ed-viewport--dragging");
      try {
        viewportEl.releasePointerCapture(e.pointerId);
      } catch {
        return;
      }
    };

    viewportEl.onpointercancel = function () {
      panDragging = false;
      viewportEl.classList.remove("vex-ed-viewport--dragging");
    };
  }

  function setupZoomControls() {
    const zoomIn = document.getElementById("vex-ed-zoom-in");
    const zoomOut = document.getElementById("vex-ed-zoom-out");
    const zoomReset = document.getElementById("vex-ed-zoom-reset");
    if (zoomIn) {
      zoomIn.addEventListener("click", function onZoomIn() {
        zoomByFactor(ZOOM_STEP);
      });
    }
    if (zoomOut) {
      zoomOut.addEventListener("click", function onZoomOut() {
        zoomByFactor(1 / ZOOM_STEP);
      });
    }
    if (zoomReset) {
      zoomReset.addEventListener("click", function onZoomReset() {
        resetView();
      });
    }
    updateZoomLabel();
  }

  function renderDocument(vexDoc, viewportOptions) {
    const resetViewport = viewportOptions && viewportOptions.resetViewport === true;
    const describes = vexDoc.describes;
    if (describes.length === 0) {
      contentEl.innerHTML = "";
      const p = document.createElement("p");
      p.className = "vex-ed-placeholder";
      p.textContent = "No top-level describe blocks.";
      contentEl.appendChild(p);
      if (resetViewport) {
        requestAnimationFrame(function () {
          resetView();
        });
      }
      return;
    }

    if (describes.length !== lastDescribeCount) {
      selectedTabIndex = 0;
    }
    lastDescribeCount = describes.length;
    if (selectedTabIndex >= describes.length) {
      selectedTabIndex = 0;
    }

    const tabsEl = document.getElementById("vex-ed-tabs");
    tabsEl.innerHTML = "";
    describes.forEach(function (d, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vex-ed-tab" + (index === selectedTabIndex ? " vex-ed-tab--active" : "");
      btn.textContent = d.label;
      btn.addEventListener("click", function onTabClick() {
        selectedTabIndex = index;
        if (lastDocument !== null) {
          renderDocument(lastDocument, { resetViewport: true });
        }
      });
      tabsEl.appendChild(btn);
    });

    contentEl.innerHTML = "";

    if (resetViewport) {
      requestAnimationFrame(function () {
        resetView();
      });
    }
  }

  function renderPayload(payload) {
    const titleEl = document.getElementById("vex-ed-title");
    const idleEl = document.getElementById("vex-ed-idle");
    const errEl = document.getElementById("vex-ed-error");
    const mainEl = document.getElementById("vex-ed-main");
    const tabsEl = document.getElementById("vex-ed-tabs");

    idleEl.hidden = true;
    errEl.hidden = true;
    mainEl.hidden = true;

    if (payload.kind === "idle") {
      lastDocument = null;
      if (tabsEl) {
        tabsEl.innerHTML = "";
      }
      idleEl.hidden = false;
      idleEl.textContent = payload.message;
      titleEl.textContent = "Vex";
      return;
    }

    if (payload.kind === "parseError") {
      lastDocument = null;
      if (tabsEl) {
        tabsEl.innerHTML = "";
      }
      errEl.hidden = false;
      titleEl.textContent = "Vex";
      const parts = payload.errors.map(function (e) {
        return "Line " + String(e.line) + ": " + escapeHtml(e.message);
      });
      errEl.innerHTML =
        "<p><strong>Parse error</strong></p><ul>" +
        parts
          .map(function (p) {
            return "<li>" + p + "</li>";
          })
          .join("") +
        "</ul>";
      return;
    }

    if (payload.kind === "document") {
      lastDocument = payload.document;
      mainEl.hidden = false;
      const base = payload.fileName ? payload.fileName.split(/[/\\]/).pop() : "Vex";
      titleEl.textContent = base + " — visual";
      const resetViewport = !hasDoneInitialViewportReset;
      hasDoneInitialViewportReset = true;
      renderDocument(payload.document, { resetViewport: resetViewport });
      return;
    }
  }

  window.addEventListener("message", function (event) {
    const msg = event.data;
    if (msg && msg.type === "vexVisual") {
      renderPayload(msg.payload);
    }
  });

  setupPan();
  setupZoomControls();
  vscode.postMessage({ type: "vexVisualReady" });
})();
