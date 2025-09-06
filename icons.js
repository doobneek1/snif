
// --- CONFIG ---
const HIDE_ICON_IF_MARKED = false; // set true to hide, false to color red
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
  node.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    await markUuid(uuid);
    colorOrHideIcon(node);
    showSnackbar('Marked. Undo?', async () => {
      await unmarkUuid(uuid);
      restoreIcon(node);
    });
  });
}

async function processIcon(node) {
  const uuid = getUuidFromNode(node);
  if (!uuid) return;
  if (await isUuidMarked(uuid)) {
    colorOrHideIcon(node);
  }
  addContextMenuHandler(node, uuid);
}

function scanAndEnhanceIcons() {
  // You may want to adjust this selector to match your icons/avatars
  document.querySelectorAll('.chat-message-container, .avatar-img, .avatar, .icon, [data-uuid]').forEach(processIcon);
}

// Initial scan
scanAndEnhanceIcons();

// Watch for new icons
new MutationObserver(muts => {
  muts.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        if (node.matches('.chat-message-container, .avatar-img, .avatar, .icon, [data-uuid]')) {
          processIcon(node);
        } else {
          // Check descendants
          node.querySelectorAll?.('.chat-message-container, .avatar-img, .avatar, .icon, [data-uuid]').forEach(processIcon);
        }
      }
    });
  });
}).observe(document.body, { childList: true, subtree: true });
