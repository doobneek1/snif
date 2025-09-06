// Opens a chat URL in a background tab.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "OPEN_CHAT_URL" && typeof msg.url === "string") {
    chrome.tabs.create({ url: msg.url, active: false }, () => {
      sendResponse({ ok: true });
    });
    // indicate async response
    return true;
  }
});
