(function() {
  console.log("✅ Read-marker injector active");

  // Create a "Seen" read-marker element
  function createReadMarker() {
    const marker = document.createElement("div");
    marker.className = "read-marker";
    marker.innerHTML = `<i class="fa fa-check-circle static"></i> Seen`;
    return marker;
  }

  // Create a date element (you could pass a dynamic timestamp)
  function createDateLabel() {
    const date = document.createElement("div");
    date.className = "message-date right";
    date.textContent = " just now "; // or supply real time
    return date;
  }

  // Enhance message container if it’s missing the read-marker
  function enhanceMessage(node) {
    if (!node.querySelector(".read-marker")) {
      console.log("⚡ Adding read-marker to", node.id);
      const marker = createReadMarker();
      node.appendChild(marker);

      // Also add a date label before the container, if needed
      if (!node.parentElement.querySelector(".message-date")) {
        const date = createDateLabel();
        node.parentElement.insertBefore(date, node);
      }
    }
  }

  // Look for already-existing “short” messages
  document.querySelectorAll(".chat-message-container").forEach(enhanceMessage);

  // Watch for future messages being added
  new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains("chat-message-container")) {
          enhanceMessage(node);
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
