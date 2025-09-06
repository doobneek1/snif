(function () {
  const input = document.getElementById("link");
  const btn = document.getElementById("go");
  const statusEl = document.getElementById("status");

  const HEX24_RE = /([a-f0-9]{24})/i;

  function setStatus(msg, ok = true) {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? "#0a0" : "#c00";
    console.log("[Popup]", msg);
  }

  function extractHexId(str) {
    if (!str) return null;
    const m = HEX24_RE.exec(String(str));
    return m ? m[1] : null;
  }

  function parseIdFromUrlMaybeChat(raw) {
    // Accept full sniffies profile/chat URLs or any string containing a 24-hex
    try {
      const u = new URL(raw);
      // Expect /profile/<id> or /profile/<id>/chat
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("profile");
      if (idx >= 0 && parts[idx + 1]) {
        const id = extractHexId(parts[idx + 1]);
        if (id) return id;
      }
      // Otherwise fall back to hex anywhere
      return extractHexId(raw);
    } catch {
      return extractHexId(raw);
    }
  }

  function buildChatUrl(id) {
    return `https://sniffies.com/profile/${id}/chat`;
  }

  btn.addEventListener("click", async () => {
    setStatus("Starting…");
    const raw = input.value.trim();
    const id = parseIdFromUrlMaybeChat(raw);
    if (!id) {
      setStatus("Couldn’t find a 24-char ID in that input.", false);
      return;
    }
    const chatUrl = buildChatUrl(id);

    try {
      // Always open background chat tab
      await chrome.runtime.sendMessage({ type: "OPEN_CHAT_URL", url: chatUrl });
      setStatus("Opened chat in background.");

      // Optionally: try to “click” matching DOM element in the active tab
      // (not necessary for opening chat, but kept if you still want the click)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          args: [id],
          func: (hexId) => {
            function dispatchClick(el) {
              ["pointerdown", "mousedown", "mouseup", "click"].forEach(type =>
                el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
              );
              return true;
            }
            const findImg = (id) =>
              [...document.querySelectorAll('img[src*="profile.sniffiesassets.com/"]')].find(img => img.src.includes(id));

            const findMarker = (id) =>
              [...document.querySelectorAll('[data-testid="cv-marker-avatar-image"]')]
                .find(div => (div.style.backgroundImage || getComputedStyle(div).backgroundImage).includes(id));

            const target = findImg(hexId) || findMarker(hexId);
            if (!target) return { ok: false, reason: "Element not found" };
            dispatchClick(target);
            return { ok: true, reason: "Clicked element" };
          }
        }).catch(() => [{ result: null }]);

        console.log("[Popup] Injected click result:", result);
      }
    } catch (e) {
      console.error("[Popup] Error:", e);
      setStatus(`Error: ${e?.message || e}`, false);
    }
  });
})();
