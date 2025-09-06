(function () {
  const input = document.getElementById("link");
  const goBtn = document.getElementById("go");
  const addBtn = document.getElementById("add-to-db");
  const removeBtn = document.getElementById("remove-from-db");
  const statusEl = document.getElementById("status");

  const HEX24_RE = /([a-f0-9]{24})/i;
  const MASKED_PROFILE_DB_KEY = "maskedProfileIds";

  function setStatus(msg, ok = true) {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? "#0a0" : "#c00";
  }

  function extractHexId(str) {
    if (!str) return null;
    const m = HEX24_RE.exec(String(str));
    return m ? m[1] : null;
  }

  function parseIdFromUrl(raw) {
    try {
      const u = new URL(raw);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("profile");
      if (idx >= 0 && parts[idx + 1]) {
        const id = extractHexId(parts[idx + 1]);
        if (id) return id;
      }
      return extractHexId(raw);
    } catch {
      return extractHexId(raw);
    }
  }

  async function updateDatabase(id, action) {
    const { [MASKED_PROFILE_DB_KEY]: ids = [] } = await chrome.storage.local.get(MASKED_PROFILE_DB_KEY);
    const idSet = new Set(ids);
    let changed = false;

    if (action === 'add') {
      if (!idSet.has(id)) {
        idSet.add(id);
        changed = true;
        setStatus(`ID ${id} added to DB.`);
      } else {
        setStatus(`ID ${id} is already in the DB.`);
      }
    } else if (action === 'remove') {
      if (idSet.has(id)) {
        idSet.delete(id);
        changed = true;
        setStatus(`ID ${id} removed from DB.`);
      } else {
        setStatus(`ID ${id} was not found in the DB.`, false);
      }
    }

    if (changed) {
      await chrome.storage.local.set({ [MASKED_PROFILE_DB_KEY]: [...idSet] });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "RESCAN_PAGE_FOR_MASKING" });
      }
    }
  }

  goBtn.addEventListener("click", async () => {
    setStatus("Opening chat…");
    const raw = input.value.trim();
    const id = parseIdFromUrl(raw);
    if (!id) {
      setStatus("Couldn’t find a 24-char ID in the input.", false);
      return;
    }
    const chatUrl = `https://sniffies.com/profile/${id}/chat`;
    await chrome.runtime.sendMessage({ type: "OPEN_CHAT_URL", url: chatUrl });
    setStatus("Opened chat in background.");
  });

  addBtn.addEventListener("click", () => {
    const raw = input.value.trim();
    const id = parseIdFromUrl(raw);
    if (!id) {
      setStatus("No valid ID found to add.", false);
      return;
    }
    updateDatabase(id, 'add');
  });

  removeBtn.addEventListener("click", () => {
    const raw = input.value.trim();
    const id = parseIdFromUrl(raw);
    if (!id) {
      setStatus("No valid ID found to remove.", false);
      return;
    }
    updateDatabase(id, 'remove');
  });
})();
