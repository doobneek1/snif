(() => {
  "use strict";

  const HEX24_RE = /([a-f0-9]{24})/i;

  function getHexIdFromString(str) {
    if (!str) return null;
    const m = HEX24_RE.exec(String(str));
    return m ? m[1] : null;
  }

  function extractIdFromStyleBg(el) {
    const s = el?.style?.backgroundImage || getComputedStyle(el).backgroundImage || "";
    return getHexIdFromString(s);
  }

  function extractIdFromImgSrc(el) {
    const src = el?.src || "";
    return getHexIdFromString(src);
  }

  function buildChatUrlFromId(id) {
    return `https://sniffies.com/profile/${id}/chat`;
  }

  function openChatInBackground(url) {
    chrome.runtime.sendMessage({ type: "OPEN_CHAT_URL", url });
  }

  // Delegate clicks on relevant elements
  function onClick(e) {
    // Priority 1: any element with explicit chat URL
    let el = e.target;
    while (el && el !== document.body) {
      const chatUrl = el.getAttribute?.("data-sl-chat-url");
      if (chatUrl) {
        e.preventDefault();
        e.stopPropagation();
        openChatInBackground(chatUrl);
        return;
      }
      el = el.parentElement;
    }

    // Otherwise try the known containers
    const target = e.target;

    // Case A: marker avatar (map marker)
    const marker = target.closest?.('[data-testid="cv-marker-avatar-image"]');
    if (marker) {
      const id = extractIdFromStyleBg(marker);
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        openChatInBackground(buildChatUrlFromId(id));
        return;
      }
    }

    // Case B: avatar container (profile panel/card)
    const avatarImg = target.closest?.('.avatar-outer-container .avatar-img, [data-testid="avatarImage"]');
    if (avatarImg) {
      const id = extractIdFromStyleBg(avatarImg) || extractIdFromImgSrc(avatarImg);
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        openChatInBackground(buildChatUrlFromId(id));
        return;
      }
    }

    // Case C: direct <img> with assets URL
    const assetImg = target.closest?.('img[src*="profile.sniffiesassets.com/"]');
    if (assetImg) {
      const id = extractIdFromImgSrc(assetImg);
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        openChatInBackground(buildChatUrlFromId(id));
        return;
      }
    }
  }

  document.addEventListener("click", onClick, true);

  // Optional: augment dynamic markers with an "Open chat" button (idempotent)
  const PROCESSED = "data-sl-chatlink-processed";
  function enhanceCandidate(el) {
    if (!el || el.getAttribute(PROCESSED) === "1") return;

    // Only add button if we can resolve an ID
    const id = extractIdFromStyleBg(el) || extractIdFromImgSrc(el);
    const existingChat = el.getAttribute?.("data-sl-chat-url");
    if (!id && !existingChat) return;

    const chatUrl = existingChat || buildChatUrlFromId(id);

    // Small button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Open chat";
    btn.style.position = "absolute";
    btn.style.bottom = "4px";
    btn.style.right = "4px";
    btn.style.padding = "4px 6px";
    btn.style.fontSize = "12px";
    btn.style.border = "1px solid #ccc";
    btn.style.borderRadius = "4px";
    btn.style.background = "#fff";
    btn.style.cursor = "pointer";
    btn.style.zIndex = "9999";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openChatInBackground(chatUrl);
    });

    // Ensure anchoring parent is positioned
    const parent = el.closest(".avatar-container, .avatar-outer-container") || el.parentElement || el;
    const style = getComputedStyle(parent);
    if (style.position === "static") parent.style.position = "relative";
    parent.appendChild(btn);

    el.setAttribute(PROCESSED, "1");
    parent.setAttribute(PROCESSED, "1");
    parent.setAttribute("data-sl-chat-url", chatUrl);
  }

  function scan() {
    document.querySelectorAll('[data-testid="cv-marker-avatar-image"]').forEach(enhanceCandidate);
    document.querySelectorAll('.avatar-outer-container .avatar-img, [data-testid="avatarImage"]')
      .forEach(enhanceCandidate);
    document.querySelectorAll('img[src*="profile.sniffiesassets.com/"]').forEach(enhanceCandidate);
  }

  // Initial + observe for dynamic DOM
  scan();
  const mo = new MutationObserver(() => scan());
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: false });
})();
