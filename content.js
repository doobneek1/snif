(() => {
  "use strict";

  // Regex to capture the 24-char ID after sniffiesassets.com/
  const ID_RE = /sniffiesassets\.com\/([a-f0-9]{24})\//i;

  // Avoid reprocessing the same element
  const PROCESSED_FLAG = "data-sl-chatlink-processed";

  function extractIdFromBackgroundImage(styleVal) {
    if (!styleVal) return null;
    // styleVal looks like: url("https://profile.sniffiesassets.com/<id>/<rest>.jpeg")
    const match = ID_RE.exec(styleVal);
    return match ? match[1] : null;
  }

  function buildChatUrl(id) {
    return `https://sniffies.com/profile/${id}/chat`;
  }

  function makeButton(url) {
    const btn = document.createElement("button");
    btn.textContent = "Open chat";
    btn.setAttribute("type", "button");
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
      e.stopPropagation();
      e.preventDefault();
      window.open(url, "_blank", "noopener");
    });

    return btn;
  }

  function ensurePositioned(el) {
    const cs = window.getComputedStyle(el);
    if (cs.position === "static" || !cs.position) {
      el.style.position = "relative";
    }
  }

  function processAvatarImgEl(avatarImgEl) {
    if (!avatarImgEl || avatarImgEl.getAttribute(PROCESSED_FLAG) === "1") return;

    // The style attribute holds background-image
    const bg = avatarImgEl.style && avatarImgEl.style.backgroundImage
      ? avatarImgEl.style.backgroundImage
      : avatarImgEl.getAttribute("style") || "";

    const id = extractIdFromBackgroundImage(bg);
    if (!id) return;

    const url = buildChatUrl(id);

    // Try to place the button on the nearest reasonable container.
    // Common container seen in snippet: a div.avatar (or .avatar-container / .avatar-outer-container)
    let container = avatarImgEl.closest(".avatar, .avatar-container, .avatar-outer-container");
    if (!container) container = avatarImgEl.parentElement || avatarImgEl;

    ensurePositioned(container);

    // Prevent duplicates
    if (!container.querySelector('button[data-sl-chatlink="1"]')) {
      const btn = makeButton(url);
      btn.setAttribute("data-sl-chatlink", "1");
      container.appendChild(btn);
    }

    // Mark processed
    avatarImgEl.setAttribute(PROCESSED_FLAG, "1");

    // Also store for reference
    avatarImgEl.setAttribute("data-sl-chat-url", url);
    // Console for quick debugging/use
    // eslint-disable-next-line no-console
    console.log("Sniffies chat URL:", url);
  }

  function scan(root = document) {
    // The target in your snippet is: div[data-testid="avatarImage"].avatar-img
    const nodes = root.querySelectorAll('div[data-testid="avatarImage"].avatar-img');
    nodes.forEach(processAvatarImgEl);
  }

  // Initial scan
  scan(document);

  // Observe for dynamic content updates (Angular app)
  const observer = new MutationObserver((mutationList) => {
    for (const m of mutationList) {
      if (m.type === "childList") {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          // If the added node is the target or contains it
          if (
            node.matches?.('div[data-testid="avatarImage"].avatar-img') ||
            node.querySelector?.('div[data-testid="avatarImage"].avatar-img')
          ) {
            scan(node);
          }
        });
      } else if (m.type === "attributes") {
        // If a background-image changes on the target node
        if (
          m.target &&
          m.target.nodeType === 1 &&
          m.target.matches('div[data-testid="avatarImage"].avatar-img') &&
          m.attributeName === "style"
        ) {
          processAvatarImgEl(m.target);
        }
      }
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"]
  });
})();
