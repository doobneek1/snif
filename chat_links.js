(() => {
  "use strict";

  // This script is a consolidation of content.js and jesus.js

  // --- CONFIG ---
  const ID_RE = /([a-f0-9]{24})/i;
  const PROCESSED_FLAG = "data-sl-chatlink-processed";

  // --- UTILITY FUNCTIONS ---
  function getHexIdFromString(str) {
    if (!str) return null;
    const m = ID_RE.exec(String(str));
    return m ? m[1] : null;
  }

  function extractIdFromStyle(el) {
    if (!el) return null;
    const style = el.style?.backgroundImage || getComputedStyle(el).backgroundImage || el.getAttribute("style") || "";
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
      zIndex: "9999",
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      openChatInBackground(url);
    });

    return btn;
  }

  function processElement(el) {
    if (!el || el.getAttribute(PROCESSED_FLAG) === "1") return;
    el.setAttribute(PROCESSED_FLAG, "1"); // Mark early to prevent reprocessing

    const id = extractIdFromStyle(el) || extractIdFromImgSrc(el);
    if (!id) return;

    const url = buildChatUrlFromId(id);

    // Find the best container to attach the button to
    let container = el.closest(".avatar-container, .avatar-outer-container") || el.parentElement;
    if (!container) return;

    ensurePositioned(container);

    // Prevent duplicate buttons
    if (container.querySelector('button[data-sl-chatlink="1"]')) return;
    
    const btn = makeButton(url);
    btn.setAttribute("data-sl-chatlink", "1");
    container.appendChild(btn);

    // Store for reference, useful for other scripts or debugging
    container.setAttribute("data-sl-chat-url", url);
    console.log("Sniffies chat link added:", url);
  }

  // --- DOM SCANNING ---
  const SELECTORS = [
    '[data-testid="avatarImage"]',
    '[data-testid="cv-marker-avatar-image"]',
    'img[src*="profile.sniffiesassets.com/"]',
    '.avatar-img'
  ].join(',');

  function scan(root = document) {
    root.querySelectorAll(SELECTORS).forEach(processElement);
    // Also check the root itself if it's a newly added node
    if (root.matches?.(SELECTORS)) {
        processElement(root)
    }
  }

  // --- INITIAL SCAN & MUTATION OBSERVER ---
  scan();

  const observer = new MutationObserver((mutationList) => {
    for (const m of mutationList) {
      if (m.type === "childList") {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            scan(node);
          }
        });
      } else if (m.type === "attributes" && m.attributeName === "style") {
        // Handle style changes, e.g., background-image loading later
        if (m.target?.nodeType === 1 && m.target.matches(SELECTORS)) {
            processElement(m.target);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"]
  });

})();
