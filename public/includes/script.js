let timerId = null;
const label = document.getElementById("autoJbLabel");
const checkbox = document.getElementById("autoJbInput");
const jeilbrekBtn = document.getElementById("jeilbrek");
const UAElement = document.getElementById("UA");
const consoleElem = document.getElementById("console");

const storedAutoJb = localStorage.getItem("autoJb");
let autoJbValue = storedAutoJb !== null ? storedAutoJb === "true" : true;

// choose one of kernel exploits
var exploitChain = localStorage.getItem("exploitChain") || "lapse";
const netctrlRadio = document.getElementById("netctrl-exploit");
const lapseRadio = document.getElementById("lapse-exploit");
const kexForm = document.getElementById("kernel-options");

let isCacheFinished = false;

// Show user agent
if (UAElement) {
  UAElement.innerText += " " + navigator.userAgent;
}

// Helper to log directly to the HTML console element
function logConsole(msg, type = "info") {
  if (!consoleElem) return;
  const prefix = type === "error" ? "[-] " : type === "warn" ? "[*] " : "[+] ";
  consoleElem.append(`${prefix}${msg}\n`);
  consoleElem.scrollTop = consoleElem.scrollHeight;
}

kexForm.addEventListener("change", function (event) {
  localStorage.setItem("exploitChain", event.target.value);
  exploitChain = event.target.value;
});

let passCount = parseInt(localStorage.getItem("exploit_pass") || "0", 10);
let failCount = parseInt(localStorage.getItem("exploit_fail") || "0", 10);
const passCountElem = document.getElementById("pass-count");
const failCountElem = document.getElementById("fail-count");

function updateStatsUI() {
  if (passCountElem) passCountElem.textContent = passCount;
  if (failCountElem) failCountElem.textContent = failCount;
}

function incrementPass() {
  passCount++;
  localStorage.setItem("exploit_pass", passCount.toString());
  updateStatsUI();
}

function incrementFail() {
  failCount++;
  localStorage.setItem("exploit_fail", failCount.toString());
  updateStatsUI();
}

let jbTimeoutId = null;
let isExploitRunning = false;
const EXPLOIT_TIMEOUT_MS = 30000; // Default 30 seconds

// Console Toggle & Auto-Collapse
const consoleWrapper = document.getElementById("console-wrapper");
const toggleConsoleBtn = document.getElementById("toggle-console-btn");

function collapseConsole() {
  if (consoleWrapper) {
    consoleWrapper.classList.add("collapsed");
    if (toggleConsoleBtn) toggleConsoleBtn.textContent = "Show Console [+]";
  }
}

function expandConsole() {
  if (consoleWrapper) {
    consoleWrapper.classList.remove("collapsed");
    if (toggleConsoleBtn) toggleConsoleBtn.textContent = "Hide Console [-]";
  }
}

function toggleConsole() {
  if (!consoleWrapper) return;
  if (consoleWrapper.classList.contains("collapsed")) {
    expandConsole();
  } else {
    collapseConsole();
  }
}

if (toggleConsoleBtn) {
  toggleConsoleBtn.addEventListener("click", toggleConsole);
}

let isJailbreakSuccessful = false;

// Dynamic Payloads List Renderer
function renderPayloadsList(assets) {
  const payloadsListElem = document.getElementById("payloads-list");
  if (!payloadsListElem) return;

  const payloadFiles = assets.filter((path) => path.startsWith("src/payloads/"));

  if (payloadFiles.length === 0) {
    payloadsListElem.innerHTML = `<p class="empty-msg">No extra payloads found in manifest.</p>`;
    return;
  }

  payloadsListElem.className = "payloads-grid";
  payloadsListElem.innerHTML = "";

  payloadFiles.forEach((path) => {
    const fileName = path.split("/").pop();
    const displayName = fileName.replace(/\.bin$/i, "").replace(/_/g, " ");

    const card = document.createElement("div");
    card.className = "payload-card";
    card.innerHTML = `
      <div>
        <div class="payload-title">${displayName}</div>
        <div class="payload-file">${path}</div>
      </div>
      <button class="btn-payload" disabled data-path="${path}">Run Payload</button>
    `;

    payloadsListElem.appendChild(card);
  });

  const payloadBtns = document.querySelectorAll(".btn-payload");
  payloadBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      if (!isJailbreakSuccessful) return;
      const targetPath = this.getAttribute("data-path");
      logConsole(`Executing standalone payload: ${targetPath}...`, "info");
      if (typeof run_standalone_payload === "function") {
        run_standalone_payload(targetPath);
      } else {
        logConsole("run_standalone_payload function not available.", "error");
      }
    });
  });

  updatePayloadButtonsState();
}

function updatePayloadButtonsState() {
  const payloadBtns = document.querySelectorAll(".btn-payload");
  payloadBtns.forEach((btn) => {
    btn.disabled = !isJailbreakSuccessful;
  });
}

window.onExploitSuccess = function () {
  if (!isExploitRunning) return;
  isExploitRunning = false;
  isJailbreakSuccessful = true;
  if (jbTimeoutId) {
    clearTimeout(jbTimeoutId);
    jbTimeoutId = null;
  }
  logConsole("Exploit executed successfully!", "info");
  incrementPass();
  updatePayloadButtonsState(); // Enable extra payload buttons post-jailbreak!
  collapseConsole(); // Automatically close console on exploit success to give more room for payloads!
};

window.onExploitAlreadyDone = function () {
  if (!isExploitRunning) return;
  isExploitRunning = false;
  isJailbreakSuccessful = true;
  if (jbTimeoutId) {
    clearTimeout(jbTimeoutId);
    jbTimeoutId = null;
  }
  logConsole("System is ALREADY jailbroken! Exploit bypassed safely.", "warn");
  document.title = "\u2713 Already Jailbroken";
  label.textContent = "Already Jailbroken";
  jeilbrekBtn.disabled = true;
  updatePayloadButtonsState(); // Enable extra payload buttons directly!
  collapseConsole();
};

window.onExploitFail = function (reason) {
  if (!isExploitRunning) return;
  isExploitRunning = false;
  isJailbreakSuccessful = false;
  if (jbTimeoutId) {
    clearTimeout(jbTimeoutId);
    jbTimeoutId = null;
  }
  logConsole(`Exploit failed: ${reason}`, "error");
  incrementFail();
  updatePayloadButtonsState();
};

function runJbWithTimeout() {
  if (!isCacheFinished || isExploitRunning) return;
  isExploitRunning = true;
  jeilbrekBtn.disabled = true;
  netctrlRadio.disabled = true;
  lapseRadio.disabled = true;
  checkbox.disabled = true;
  updatePayloadButtonsState();
  stopInterval();

  logConsole("Executing exploit (Timeout limit: 30s)...", "info");

  jbTimeoutId = setTimeout(function () {
    if (isExploitRunning) {
      isExploitRunning = false;
      logConsole("Exploit TIMEOUT reached (30 seconds exceeded)!", "error");
      incrementFail();
      updatePayloadButtonsState();
      label.textContent = "Timed Out";
      document.title = "X Exploit Timeout";
    }
  }, EXPLOIT_TIMEOUT_MS);

  doJb();
}

// jailbreak execution
jeilbrekBtn.addEventListener("click", function (e) {
  runJbWithTimeout();
});

checkbox.addEventListener("change", function () {
  localStorage.setItem("autoJb", checkbox.checked);
  if (!isCacheFinished) return;

  if (checkbox.checked == true && jeilbrekBtn.disabled == false) {
    jailbreakCountdown();
    return;
  }

  stopInterval();
});

function stopInterval() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  label.textContent = "Auto Jailbreak";
}

function jailbreakCountdown() {
  stopInterval();
  if (!isCacheFinished || isExploitRunning) return;

  let countdown = 5;
  label.textContent = `Auto Jailbreaking in: ${countdown}`;
  timerId = setInterval(() => {
    countdown--;
    label.textContent = `Auto Jailbreaking in: ${countdown}`;

    if (countdown < 0) {
      clearInterval(timerId);
      timerId = null;
      label.textContent = "Executing";
      runJbWithTimeout();
    }
  }, 1000);
}

function finishCache(statusMessage, isError = false) {
  if (isCacheFinished) return;
  isCacheFinished = true;

  if (isError) {
    document.title = "X Cache Error";
    logConsole(statusMessage, "error");
    logConsole("CACHE ERROR: Process locked! Exploit & controls are disabled.", "error");

    // Strictly lock UI elements when caching fails
    jeilbrekBtn.disabled = true;
    netctrlRadio.disabled = true;
    lapseRadio.disabled = true;
    checkbox.disabled = true;
    updatePayloadButtonsState();
    stopInterval();
    return;
  }

  logConsole(statusMessage, "info");
  logConsole("Caching phase complete. System controls enabled.", "info");

  // Enable UI elements ONLY when caching succeeds
  jeilbrekBtn.disabled = false;
  netctrlRadio.disabled = false;
  lapseRadio.disabled = false;
  checkbox.disabled = false;
  updatePayloadButtonsState();

  // Start auto jailbreak countdown ONLY after caching is successfully finished
  if (checkbox.checked) {
    jailbreakCountdown();
  }
}

let manifestFiles = [];

async function handleCache() {
  logConsole("Initializing offline cache system...", "info");
  manifestFiles = await getAssetsFromManifest();
  renderPayloadsList(manifestFiles);

  // AppCache (PS4 WebKit)
  if (window.applicationCache) {
    const appCache = window.applicationCache;
    logConsole("[Cache] PS4 AppCache interface detected.", "info");

    appCache.addEventListener(
      "checking",
      function () {
        logConsole("[Cache] Checking manifest update...", "info");
      },
      false,
    );

    appCache.addEventListener(
      "downloading",
      function () {
        logConsole("[Cache] Downloading resources to cache...", "info");
      },
      false,
    );

    appCache.addEventListener(
      "progress",
      function (e) {
        if (e.loaded && e.total) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const fileName = manifestFiles[e.loaded - 1] || "";
          const fileInfo = fileName ? ` - ${fileName}` : "";
          document.title = "Caching: " + percent + "%";
          logConsole(`[Cache] Progress: ${percent}% (${e.loaded}/${e.total})${fileInfo}`, "info");
        } else {
          logConsole("[Cache] Downloading assets...", "info");
        }
      },
      false,
    );

    appCache.addEventListener(
      "cached",
      function () {
        document.title = "\u2713 Cached";
        finishCache("[Cache] All resources stored in offline cache successfully.");
      },
      false,
    );

    appCache.addEventListener(
      "noupdate",
      function () {
        document.title = "\u2713 Up to date";
        finishCache("[Cache] Offline cache is already up to date.");
      },
      false,
    );

    appCache.addEventListener(
      "updateready",
      function () {
        try {
          appCache.swapCache();
        } catch (err) {}
        document.title = "\u2713 Updated";
        finishCache("[Cache] Offline cache updated successfully.");
      },
      false,
    );

    appCache.addEventListener(
      "obsolete",
      function () {
        finishCache("[Cache Error] Manifest obsolete (404/410).", true);
      },
      false,
    );

    appCache.addEventListener(
      "error",
      function () {
        finishCache("[Cache Error] Failed to download cache resources. Please check missing files (HTTP 404).", true);
      },
      false,
    );
  } else if ("serviceWorker" in navigator && (location.protocol.startsWith("http") || location.protocol === "https:")) {
    // Service Worker (PC / Modern Browser)
    logConsole("[Cache] Service Worker interface detected (PC mode).", "info");
    navigator.serviceWorker
      .register("sw.js")
      .then(function (reg) {
        logConsole("[Cache SW] Service Worker registered successfully.", "info");

        navigator.serviceWorker.addEventListener("message", function (event) {
          const data = event.data;
          if (!data) return;

          if (data.type === "CACHE_PROGRESS") {
            document.title = "Caching: " + data.percent + "%";
            logConsole(`[Cache SW] Progress: ${data.percent}% (${data.loaded}/${data.total}) - ${data.asset}`, "info");
          } else if (data.type === "CACHE_COMPLETE") {
            document.title = "\u2713 Cached";
            if (data.errors && data.errors.length > 0) {
              logConsole(`[Cache SW Error] Some files failed to cache:\n  - ${data.errors.join("\n  - ")}`, "warn");
              finishCache("[Cache SW] Caching completed with missing optional files.", true);
            } else {
              finishCache("[Cache SW] All assets cached successfully for PC testing.");
            }
          }
        });

        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CHECK_CACHE" });
        }
      })
      .catch(function (err) {
        logConsole(`[Cache SW Error] Registration failed: ${err.message}`, "error");
        finishCache("[Cache SW Error] Service Worker failed to register.", true);
      });

    // Safety timeout for SW on PC
    setTimeout(function () {
      if (!isCacheFinished) {
        finishCache("[Cache SW] SW initialization completed.");
      }
    }, 4000);
  } else {
    // Standalone / Non-cache mode (e.g. file://)
    logConsole("[Cache] Running in non-cached/standalone mode.", "warn");
    finishCache("[Cache] Caching bypassed.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Update Pass/Fail Stats UI from localStorage
  updateStatsUI();

  // Choose preferred exploit chain
  if (exploitChain == "netctrl") {
    netctrlRadio.checked = true;
  } else {
    lapseRadio.checked = true;
  }

  // Apply autojb localStorage value
  checkbox.checked = autoJbValue;

  // Ensure buttons remain disabled initially
  jeilbrekBtn.disabled = true;
  netctrlRadio.disabled = true;
  lapseRadio.disabled = true;
  checkbox.disabled = true;

  // Start caching process
  handleCache();
});
