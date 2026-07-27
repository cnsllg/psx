let timerId = null;
const autoJbBtn = document.getElementById("autoJbBtn");
const instantJbBtn = document.getElementById("instantJbBtn");
const jeilbrekBtn = document.getElementById("jeilbrek");
const fwVerElement = document.getElementById("fw-ver");
const consoleElem = document.getElementById("console");

const storedAutoJb = localStorage.getItem("autoJb");
let autoJbValue = storedAutoJb !== null ? storedAutoJb === "true" : true;

const storedInstantJb = localStorage.getItem("instantJb");
let instantJbValue = storedInstantJb !== null ? storedInstantJb === "true" : false;

var exploitChain = localStorage.getItem("exploitChain") || "lapse";
const netctrlBtn = document.getElementById("netctrl-btn");
const lapseBtn = document.getElementById("lapse-btn");

let isCacheFinished = false;

if (fwVerElement) {
  const ua = navigator.userAgent;
  const matches = ua.match(/PlayStation\s+(\d+)[/ ](\d+)\.(\d+)/);
  if (matches) {
    const fwMajor = parseInt(matches[2], 10);
    const fwMinor = parseInt(matches[3], 16);
    fwVerElement.textContent = `PS${matches[1]} ${fwMajor}.${fwMinor.toString(16).padStart(2, "0")}`;
    fwVerElement.className = "text-green-400 font-bold";
  } else {
    fwVerElement.textContent = "Unknown/Not PS4";
    fwVerElement.className = "text-red-500 font-bold";
  }
}

function updateKexBtnUI() {
  if (exploitChain === "netctrl") {
    if (netctrlBtn) netctrlBtn.classList.add("bg-blue-600", "border-blue-500", "text-white");
    if (netctrlBtn) netctrlBtn.classList.remove("bg-gray-800", "border-gray-600");
    if (lapseBtn) lapseBtn.classList.add("bg-gray-800", "border-gray-600");
    if (lapseBtn) lapseBtn.classList.remove("bg-blue-600", "border-blue-500", "text-white");
  } else {
    if (lapseBtn) lapseBtn.classList.add("bg-blue-600", "border-blue-500", "text-white");
    if (lapseBtn) lapseBtn.classList.remove("bg-gray-800", "border-gray-600");
    if (netctrlBtn) netctrlBtn.classList.add("bg-gray-800", "border-gray-600");
    if (netctrlBtn) netctrlBtn.classList.remove("bg-blue-600", "border-blue-500", "text-white");
  }
}

if (netctrlBtn) {
  netctrlBtn.addEventListener("click", () => {
    exploitChain = "netctrl";
    localStorage.setItem("exploitChain", exploitChain);
    updateKexBtnUI();
  });
}

if (lapseBtn) {
  lapseBtn.addEventListener("click", () => {
    exploitChain = "lapse";
    localStorage.setItem("exploitChain", exploitChain);
    updateKexBtnUI();
  });
}

// Helper to log directly to the HTML console element
function logConsole(msg, type = "info") {
  if (!consoleElem) return;
  const prefix = type === "error" ? "[-] " : type === "warn" ? "[*] " : "[+] ";
  consoleElem.append(`${prefix}${msg}\n`);
  consoleElem.scrollTop = consoleElem.scrollHeight;
}
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



let isJailbreakSuccessful = false;

// Dynamic Payloads List Renderer
function renderPayloadsList(assets) {
  const payloadsListElem = document.getElementById("payloads-list");
  if (!payloadsListElem) return;

  const payloadFiles = assets.filter((path) => path.startsWith("src/payloads/"));

  if (payloadFiles.length === 0) {
    payloadsListElem.innerHTML = `<p class="text-xs text-gray-500 italic">No extra payloads found in manifest.</p>`;
    return;
  }

  payloadsListElem.innerHTML = "";

  const savedAutoPayloads = JSON.parse(localStorage.getItem("autoPayloads") || "{}");

  payloadFiles.forEach((path) => {
    const fileName = path.split("/").pop();
    const displayName = fileName.replace(/\.bin$/i, "").replace(/_/g, " ");
    const isAuto = !!savedAutoPayloads[path];

    const card = document.createElement("div");
    card.className = "bg-gray-800 border border-gray-700 rounded p-3 flex flex-col justify-between gap-2";
    card.innerHTML = `
      <div>
        <div class="font-bold text-sm text-gray-100 break-all">${displayName}</div>
        <div class="text-xs text-gray-500 mt-1 break-all">${path}</div>
      </div>
      <div class="flex gap-2 mt-1">
        <button class="btn-payload w-2/3 bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-1 px-2 rounded transition-colors" disabled data-path="${path}">Run</button>
        <button class="btn-payload-auto w-1/3 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-1 px-2 rounded transition-colors border border-gray-600 ${isAuto ? "active" : ""}" data-path="${path}">Auto: ${isAuto ? "ON" : "OFF"}</button>
      </div>
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

  const autoBtns = document.querySelectorAll(".btn-payload-auto");
  autoBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const targetPath = this.getAttribute("data-path");
      const currentAutoPayloads = JSON.parse(localStorage.getItem("autoPayloads") || "{}");
      if (currentAutoPayloads[targetPath]) {
        delete currentAutoPayloads[targetPath];
        this.classList.remove("active");
        this.textContent = "Auto: OFF";
      } else {
        currentAutoPayloads[targetPath] = true;
        this.classList.add("active");
        this.textContent = "Auto: ON";
      }
      localStorage.setItem("autoPayloads", JSON.stringify(currentAutoPayloads));
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

async function runAutoPayloads() {
  const savedAutoPayloads = JSON.parse(localStorage.getItem("autoPayloads") || "{}");
  const payloadPaths = Object.keys(savedAutoPayloads).filter((path) => savedAutoPayloads[path]);

  if (payloadPaths.length > 0) {
    logConsole(`Found ${payloadPaths.length} auto-payload(s). Executing...`, "info");
    for (const path of payloadPaths) {
      if (typeof run_standalone_payload === "function") {
        await run_standalone_payload(path);
        // Small delay between payloads to prevent race conditions or crashes
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    logConsole(`Auto-payload execution finished!`, "info");
  }
}

window.onExploitSuccess = async function () {
  if (!isExploitRunning) return;
  isExploitRunning = false;
  isJailbreakSuccessful = true;
  if (jbTimeoutId) {
    clearTimeout(jbTimeoutId);
    jbTimeoutId = null;
  }
  logConsole("Exploit executed successfully!", "info");
  incrementPass();
  
  if (autoJbBtn) autoJbBtn.disabled = false;
  if (instantJbBtn) instantJbBtn.disabled = false;
  if (netctrlBtn) netctrlBtn.disabled = false;
  if (lapseBtn) lapseBtn.disabled = false;
  
  updatePayloadButtonsState(); // Enable extra payload buttons post-jailbreak!
  await runAutoPayloads();
};

window.onExploitAlreadyDone = async function () {
  if (!isExploitRunning) return;
  isExploitRunning = false;
  isJailbreakSuccessful = true;
  if (jbTimeoutId) {
    clearTimeout(jbTimeoutId);
    jbTimeoutId = null;
  }
  logConsole("System is ALREADY jailbroken! Exploit bypassed safely.", "warn");
  document.title = "\u2713 Already Jailbroken";
  
  if (autoJbBtn) {
    autoJbBtn.textContent = "Already Jailbroken";
    autoJbBtn.disabled = false;
  }
  if (instantJbBtn) instantJbBtn.disabled = false;
  if (netctrlBtn) netctrlBtn.disabled = false;
  if (lapseBtn) lapseBtn.disabled = false;
  
  jeilbrekBtn.disabled = true;
  updatePayloadButtonsState(); // Enable extra payload buttons directly!
  collapseConsole();
  await runAutoPayloads();
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

  if (autoJbBtn) autoJbBtn.disabled = false;
  if (instantJbBtn) instantJbBtn.disabled = false;
  if (netctrlBtn) netctrlBtn.disabled = false;
  if (lapseBtn) lapseBtn.disabled = false;
  jeilbrekBtn.disabled = false;

  updatePayloadButtonsState();
};

function runJbWithTimeout() {
  if (!isCacheFinished || isExploitRunning) return;
  isExploitRunning = true;
  jeilbrekBtn.disabled = true;
  if (autoJbBtn) autoJbBtn.disabled = true;
  if (instantJbBtn) instantJbBtn.disabled = true;
  updatePayloadButtonsState();
  stopInterval();

  logConsole("Executing exploit (Timeout limit: 30s)...", "info");

  jbTimeoutId = setTimeout(function () {
    if (isExploitRunning) {
      isExploitRunning = false;
      logConsole("Exploit TIMEOUT reached (30 seconds exceeded)!", "error");
      incrementFail();
      updatePayloadButtonsState();
      if (autoJbBtn) autoJbBtn.textContent = "Timed Out";
      document.title = "X Exploit Timeout";
    }
  }, EXPLOIT_TIMEOUT_MS);

  doJb();
}

// jailbreak execution
jeilbrekBtn.addEventListener("click", function (e) {
  runJbWithTimeout();
});

function updateBtnState(btn, isActive, textOn, textOff) {
  if (!btn) return;
  if (isActive) {
    btn.classList.add("active");
    btn.textContent = textOn;
  } else {
    btn.classList.remove("active");
    btn.textContent = textOff;
  }
}

if (autoJbBtn) {
  autoJbBtn.addEventListener("click", () => {
    autoJbValue = !autoJbValue;
    localStorage.setItem("autoJb", autoJbValue);
    updateBtnState(autoJbBtn, autoJbValue, "Auto Jailbreak: ON", "Auto Jailbreak: OFF");
    
    // Stop any existing countdown if user interacts with this setting
    stopInterval();
  });
}

if (instantJbBtn) {
  instantJbBtn.addEventListener("click", () => {
    instantJbValue = !instantJbValue;
    localStorage.setItem("instantJb", instantJbValue);
    updateBtnState(instantJbBtn, instantJbValue, "Instant Jailbreak: ON", "Instant Jailbreak: OFF");
  });
}

function stopInterval() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  updateBtnState(autoJbBtn, autoJbValue, "Auto Jailbreak: ON", "Auto Jailbreak: OFF");
}

function jailbreakCountdown() {
  stopInterval();
  if (!isCacheFinished || isExploitRunning) return;

  let countdown = 5;
  if (autoJbBtn) autoJbBtn.textContent = `Auto Jailbreaking in: ${countdown}`;
  timerId = setInterval(() => {
    countdown--;
    if (autoJbBtn) autoJbBtn.textContent = `Auto Jailbreaking in: ${countdown}`;

    if (countdown < 0) {
      clearInterval(timerId);
      timerId = null;
      if (autoJbBtn) autoJbBtn.textContent = "Executing";
      runJbWithTimeout();
    }
  }, 1000);
}

function handleCacheFail(statusMessage) {
  isCacheFinished = true;
  stopCachingSpinner();
  document.title = "X Cache Error";
    logConsole(statusMessage, "error");
    logConsole("CACHE ERROR: Process locked! Exploit & controls are disabled.", "error");

    // Strictly lock UI elements when caching fails
    jeilbrekBtn.disabled = true;
    if (netctrlBtn) netctrlBtn.disabled = true;
    if (lapseBtn) lapseBtn.disabled = true;
    if (autoJbBtn) autoJbBtn.disabled = true;
    if (instantJbBtn) instantJbBtn.disabled = true;
    updatePayloadButtonsState();
    stopInterval();
    return;
}

function finishCache(statusMessage, isError = false) {
  if (isCacheFinished) return;
  if (isError) {
    handleCacheFail(statusMessage);
    return;
  }

  isCacheFinished = true;
  logConsole(statusMessage, "info");
  logConsole("Caching complete.", "info");
  stopCachingSpinner();

  // Enable UI elements ONLY when caching succeeds and exploit isn't already running/done
  if (!isJailbreakSuccessful) {
    jeilbrekBtn.disabled = false;
    if (netctrlBtn) netctrlBtn.disabled = false;
    if (lapseBtn) lapseBtn.disabled = false;
    if (autoJbBtn) autoJbBtn.disabled = false;
    if (instantJbBtn) instantJbBtn.disabled = false;
    updatePayloadButtonsState();
  } 

  // Start auto jailbreak countdown ONLY after caching is successfully finished
  if (instantJbValue) {
    runJbWithTimeout();
  } else if (autoJbValue) {
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
        finishCache("[Cache Error] Manifest obsolete. Execution unlocked.");
      },
      false,
    );

    appCache.addEventListener(
      "error",
      function () {
        document.title = "\u2713 Offline Cached";
        finishCache("[Cache] Check failed (likely offline). Execution unlocked.");
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
              finishCache("[Cache SW] Caching completed with missing files. Execution unlocked.");
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
        finishCache("[Cache SW Error] Service Worker failed to register. Execution unlocked.");
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

  // Handle Online/Offline Status
  const statusText = document.getElementById("status-text");
  function updateNetworkStatus() {
    if (statusText) {
      if (navigator.onLine) {
        statusText.textContent = "Online";
        statusText.className = "font-bold text-green-400";
      } else {
        statusText.textContent = "Offline (Cached)";
        statusText.className = "font-bold text-blue-400";
      }
    }
    if (!navigator.onLine) {
      stopCachingSpinner();
    }
  }
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  updateNetworkStatus();

  // Choose preferred exploit chain
  updateKexBtnUI();

  // Apply autojb localStorage value
  updateBtnState(autoJbBtn, autoJbValue, "Auto Jailbreak: ON", "Auto Jailbreak: OFF");
  updateBtnState(instantJbBtn, instantJbValue, "Instant Jailbreak: ON", "Instant Jailbreak: OFF");

  // Ensure buttons remain disabled initially
  jeilbrekBtn.disabled = true;
  if (netctrlBtn) netctrlBtn.disabled = true;
  if (lapseBtn) lapseBtn.disabled = true;
  if (autoJbBtn) autoJbBtn.disabled = true;
  if (instantJbBtn) instantJbBtn.disabled = true;

  // Start caching process
  handleCache();
});

// --- NEW FEATURES ---

// Toast Notifications
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;
  
  const toast = document.createElement("div");
  let bgColor = "bg-blue-600";
  if (type === "error") bgColor = "bg-red-600";
  if (type === "warn") bgColor = "bg-yellow-600";
  if (type === "success") bgColor = "bg-green-600";

  toast.className = `${bgColor} text-white px-4 py-2 rounded shadow-lg text-sm font-bold opacity-0 transition-opacity duration-300`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  // Fade in
  setTimeout(() => toast.classList.remove("opacity-0"), 10);
  
  // Fade out and remove
  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Update Network Status to hide spinner
function stopCachingSpinner() {
  const spinner = document.getElementById("caching-spinner");
  if (spinner) spinner.classList.add("hidden");
}

// Intercept original logConsole to also show toasts for important events
const originalLogConsole = logConsole;
logConsole = function(msg, type = "info") {
  originalLogConsole(msg, type);
  if (msg.includes("successfully!") || msg.includes("ALREADY")) {
    showToast(msg, "success");
  } else if (type === "error") {
    showToast(msg, "error");
  }
};

// Force Clear Cache
const clearCacheBtn = document.getElementById("clear-cache-btn");
if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      } catch(e) {}
    }
    showToast("Clearing cache and reloading...", "warn");
    setTimeout(() => window.location.reload(true), 1000);
  });
}

