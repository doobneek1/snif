(() => {
  "use strict";

  // --- CONFIG ---
  const ID_RE = /([a-f0-9]{24})/i;
  const PROCESSED_FLAG = "data-sl-chatlink-processed";
  const MASKED_PROFILE_DB_KEY = "maskedProfileIds"; // Key for chrome.storage.local

  // --- UTILITY FUNCTIONS ---
  function getHexIdFromString(str) {
    if (!str) return null;
    const m = ID_RE.exec(String(str));
    return m ? m[1] : null;
  }

  function extractIdFromStyle(el) {
    if (!el) return null;
    const style =
      el.style?.backgroundImage ||
      getComputedStyle(el).backgroundImage ||
      el.getAttribute("style") ||
      "";
    return getHexIdFromString(style);
  }

  function extractIdFromImgSrc(el) {
    return el?.src ? getHexIdFromString(el.src) : null;
  }

  function buildChatUrlFromId(id) {
    return `https://sniffies.com/profile/${id}/chat`;
  }

  function openChatInBackground(url) {
    // Use runtime message to open tab in background via service worker
    chrome.runtime.sendMessage({ type: "OPEN_CHAT_URL", url });
  }

  function ensurePositioned(el) {
    if (el && getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
  }

  // --- MASKING ---
  function maskProfile(el) {
    const container =
      el.closest(".avatar-container, .avatar-outer-container") || el.parentElement;
    if (container) {
      container.style.filter = "blur(20px)";
      container.style.pointerEvents = "none"; // Prevent clicks on masked profiles
    }
  }

  // --- CORE LOGIC ---
  function makeButton(url) {
    const btn = document.createElement("button");
    btn.textContent = "Open chat";
    btn.setAttribute("type", "button");
    Object.assign(btn.style, {
      position: "absolute",
      bottom: "4px",
      right: "4px",
      padding: "4px 6px",
      fontSize: "12px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      background: "#fff",
      cursor: "pointer",
      zIndex: "9999"
    });

    btn.addEventListener("click", e => {
      e.stopPropagation();
      e.preventDefault();
      openChatInBackground(url);
    });
    return btn;
  }

  async function processElement(el, maskedIds) {
    if (!el || el.getAttribute(PROCESSED_FLAG) === "1") return;
    el.setAttribute(PROCESSED_FLAG, "1"); // Mark early to prevent reprocessing

    const id = extractIdFromStyle(el) || extractIdFromImgSrc(el);
    if (!id) return;

    // Apply mask if the ID is in our stored list
    if (maskedIds.includes(id)) {
      maskProfile(el);
    }

    const url = buildChatUrlFromId(id);

    // Find the best container to attach the button to
    let container =
      el.closest(".avatar-container, .avatar-outer-container") || el.parentElement;
    if (!container) return;

    ensurePositioned(container);

    // Prevent duplicate buttons
    if (container.querySelector('button[data-sl-chatlink="1"]')) return;

    const btn = makeButton(url);
    btn.setAttribute("data-sl-chatlink", "1");
    container.appendChild(btn);

    // Store for reference, useful for other scripts or debugging
    container.setAttribute("data-sl-chat-url", url);
  }

  // --- DOM SCANNING ---
  const SELECTORS = [
    '[data-testid="avatarImage"]',
    '[data-testid="cv-marker-avatar-image"]',
    'img[src*="profile.sniffiesassets.com/"]',
    ".avatar-img"
  ].join(",");

  function scan(root = document) {
    chrome.storage.local.get(MASKED_PROFILE_DB_KEY, result => {
      const maskedIds = result[MASKED_PROFILE_DB_KEY] || [];
      root.querySelectorAll(SELECTORS).forEach(el => processElement(el, maskedIds));
      if (root.matches?.(SELECTORS)) {
        processElement(root, maskedIds);
      }
    });
  }

  // --- INITIAL SCAN & MUTATION OBSERVER ---
  scan();

  const observer = new MutationObserver(mutationList => {
    for (const m of mutationList) {
      if (m.type === "childList") {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            scan(node);
          }
        });
      } else if (m.type === "attributes" && m.attributeName === "style") {
        // Handle style changes, e.g., background-image loading later
        scan(m.target);
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"]
  });

  // Listen for messages from popup to re-scan
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "RESCAN_PAGE_FOR_MASKING") {
      // Full re-scan to apply/remove masks
      document
        .querySelectorAll(`[${PROCESSED_FLAG}]`)
        .forEach(el => el.removeAttribute(PROCESSED_FLAG));
      scan();
    }
    return true;
  });
})();
