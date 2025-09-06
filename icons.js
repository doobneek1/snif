
// --- CONFIG ---
const HIDE_ICON_IF_MARKED = true; // set true to hide, false to color red
const FIREBASE_URL = 'https://doobneek-fe7b7-default-rtdb.firebaseio.com/snif';

// --- SNACKBAR ---
function showSnackbar(message, onCancel) {
  let snackbar = document.createElement('div');
  snackbar.textContent = message;
  snackbar.style.cssText = `
    position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
    background: #333; color: #fff; padding: 12px 24px; border-radius: 6px;
    font-size: 16px; z-index: 99999; display: flex; align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2); opacity: 0.95;
  `;
  let cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'margin-left:16px; background:#fff; color:#333; border:none; border-radius:4px; padding:4px 12px; cursor:pointer;';
  snackbar.appendChild(cancelBtn);
  document.body.appendChild(snackbar);
  let timeout = setTimeout(() => snackbar.remove(), 3500);
  cancelBtn.onclick = () => {
    clearTimeout(timeout);
    snackbar.remove();
    if (onCancel) onCancel();
  };
}

// --- FIREBASE ---
async function markUuid(uuid) {
  // POST or PUT to Firebase
  await fetch(`${FIREBASE_URL}/${uuid}.json`, {
    method: 'PUT',
    body: JSON.stringify({ marked: true, ts: Date.now() }),
    headers: { 'Content-Type': 'application/json' }
  });
}

async function unmarkUuid(uuid) {
  // DELETE from Firebase
  await fetch(`${FIREBASE_URL}/${uuid}.json`, { method: 'DELETE' });
}

async function isUuidMarked(uuid) {
  const res = await fetch(`${FIREBASE_URL}/${uuid}.json`);
  if (!res.ok) return false;
  const data = await res.json();
  return !!data;
}

// --- ICON HANDLING ---
function getUuidFromNode(node) {
  // Try to extract uuid from id, data-uuid, or backgroundImage
  if (node.dataset && node.dataset.uuid) return node.dataset.uuid;
  if (node.id && /^[a-f0-9]{24}$/.test(node.id)) return node.id;
  // Try background-image
  const bg = node.style?.backgroundImage || getComputedStyle(node).backgroundImage;
  const m = /([a-f0-9]{24})/.exec(bg);
  if (m) return m[1];
  return null;
}

function colorOrHideIcon(node) {
  if (HIDE_ICON_IF_MARKED) {
    node.style.display = 'none';
  } else {
    node.style.filter = 'grayscale(1)';
    node.style.background = '#f44';
    node.style.borderRadius = '50%';
    node.style.opacity = '0.7';
  }
}

function restoreIcon(node) {
  node.style.display = '';
  node.style.filter = '';
  node.style.background = '';
  node.style.borderRadius = '';
  node.style.opacity = '';
}

function addContextMenuHandler(node, uuid) {
  // Prevent adding multiple listeners
  if (node.dataset.contextMenuAdded) return;
  node.dataset.contextMenuAdded = 'true';

  node.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent other context menus
    await markUuid(uuid);
    // No longer needed here, will be handled by the global refresh
    // colorOrHideIcon(node); 
    showSnackbar('Marked. Undo?', async () => {
      await unmarkUuid(uuid);
      // restoreIcon(node); // Handled by global refresh
      scanAndEnhanceIcons(); // Refresh all icons
    });
    // Refresh all icons after marking
    scanAndEnhanceIcons();
  }, true); // Use capture to ensure it runs
}

async function processIcon(node) {
  // Make sure we don't process children of a processed container
  if (node.closest('[data-icon-processed="true"]')) return;

  const uuid = getUuidFromNode(node);
  if (!uuid) return;

  // Mark as processed to avoid redundant checks and nested listeners
  node.dataset.iconProcessed = 'true';

  if (await isUuidMarked(uuid)) {
    colorOrHideIcon(node);
  } else {
    // Explicitly restore if it was previously hidden/colored
    restoreIcon(node);
  }
  addContextMenuHandler(node, uuid);
}

const ICON_SELECTORS = [
  // General selectors
  '.avatar', '.icon', '[data-uuid]',
  // Sniffies specific selectors from other files
  '[data-testid="avatarImage"]',
  '[data-testid="cv-marker-avatar-image"]',
  'img[src*="profile.sniffiesassets.com/"]',
  '.avatar-img',
  // grid component
  '.sc-aXZVg.jMOBSC.sc-aXZVg.jMOBSC',
  // profile card
  '.sc-aXZVg.jMOBSC.sc-183g0u6-1.jQprxC'
].join(',');

function scanAndEnhanceIcons() {
  document.querySelectorAll(ICON_SELECTORS).forEach(processIcon);
}

// Initial scan
scanAndEnhanceIcons();

// Watch for new icons
new MutationObserver(muts => {
  let needsScan = false;
  for (const m of muts) {
    if (m.type === 'childList' && m.addedNodes.length > 0) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.matches(ICON_SELECTORS) || node.querySelector(ICON_SELECTORS)) {
            needsScan = true;
            break;
          }
        }
      }
    }
    if (needsScan) break;
  }
  if (needsScan) {
    // Debounce the scan to avoid excessive runs on rapid DOM changes
    clearTimeout(window.snifflesIconScanDebounce);
    window.snifflesIconScanDebounce = setTimeout(scanAndEnhanceIcons, 100);
  }
}).observe(document.body, { childList: true, subtree: true });
