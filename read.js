// // inject.js
// (function() {
//   console.log("✅ Chatbox override script active");

//   // Utility: build a real chatbox element
//   function createRealChatbox() {
//     const container = document.createElement("div");
//     container.id = "input-container";

//     const textarea = document.createElement("textarea");
//     textarea.setAttribute("rows", "1");
//     textarea.setAttribute("placeholder", "Type your message...");
//     textarea.style.height = "24px";
//     textarea.style.overflowY = "hidden";
//     textarea.style.width = "90%";
//     textarea.style.marginRight = "8px";

//     const sendBtn = document.createElement("button");
//     sendBtn.textContent = "Send";
//     sendBtn.style.cursor = "pointer";
//     sendBtn.style.padding = "4px 8px";

//     // Simple handler
//     sendBtn.addEventListener("click", () => {
//       const text = textarea.value.trim();
//       if (text) {
//         console.log("📨 Message submitted:", text);
//         textarea.value = "";
//       }
//     });

//     container.appendChild(textarea);
//     container.appendChild(sendBtn);

//     return container;
//   }

//   // Replace fake box on click
//   function attachHandler(fakeBox) {
//     fakeBox.addEventListener("click", () => {
//       console.log("⚡ Fake box clicked, swapping in real chatbox");
//       const realBox = createRealChatbox();
//       fakeBox.replaceWith(realBox);

//       // Optional: auto-focus the textarea
//       realBox.querySelector("textarea").focus();

//       // Optional: simulate a click on the send button after a delay
//       // setTimeout(() => realBox.querySelector("button").click(), 2000);
//     });
//   }

//   // Initial scan
//   const fakeBox = document.querySelector(".chat-input-redirect");
//   if (fakeBox) attachHandler(fakeBox);

//   // Watch dynamically for fake box insertions
//   new MutationObserver(muts => {
//     muts.forEach(m => {
//       m.addedNodes.forEach(node => {
//         if (node.nodeType === 1 && node.matches(".chat-input-redirect")) {
//           console.log("👀 Fake box detected");
//           attachHandler(node);
//         }
//       });
//     });
//   }).observe(document.body, { childList: true, subtree: true });

// })();
// inject.js
(function () {
  console.log("✅ Chat injector active");

  // Build a real chatbox element
  function createRealChatbox() {
    const container = document.createElement("div");
    container.id = "input-container";
    container.style.display = "flex";
    container.style.alignItems = "center";

    // Textarea
    const textarea = document.createElement("textarea");
    textarea.name = "chatTextArea";
    textarea.rows = 1;
    textarea.placeholder = "Type your message...";
    textarea.style.height = "24px";
    textarea.style.flexGrow = "1";
    textarea.style.resize = "none";
    textarea.style.overflowY = "hidden";
    container.appendChild(textarea);

    // Send button
    const sendBtn = document.createElement("button");
    sendBtn.id = "chat-input-send";
    sendBtn.textContent = "Send";
    sendBtn.style.cursor = "pointer";
    sendBtn.style.marginLeft = "6px";
    container.appendChild(sendBtn);

    // Send handler
    sendBtn.addEventListener("click", () => {
      sendMessage(textarea);
    });

    return container;
  }

  // Simulate sending a message
  function sendMessage(textarea) {
    const text = textarea.value.trim();
    if (!text) return;

    console.log("📨 Injected message:", text);

    // Trigger input events so Angular/React see it
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));

    // Simulate pressing Enter
    const enter = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter"
    });
    textarea.dispatchEvent(enter);

    // Clear after send
    textarea.value = "";
  }

  // Replace fake box when clicked
  document.addEventListener(
    "click",
    e => {
      const fake = e.target.closest(".chat-input-redirect");
      if (fake) {
        // Block the site's own click logic
        e.stopImmediatePropagation();
        e.preventDefault();

        console.log("⚡ Fake box clicked → swapping real chatbox");

        const realBox = createRealChatbox();
        fake.replaceWith(realBox);

        // Autofill and auto-send a test message
        const textarea = realBox.querySelector("textarea");
        textarea.value = "Hello from injected chat!";
        sendMessage(textarea);
      }
    },
    true // capture phase to intercept before site handlers
  );

  // Also auto-swap if the fake box is inserted later
  new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains("chat-input-redirect")) {
          console.log("👀 Fake box detected, replacing automatically");
          const realBox = createRealChatbox();
          node.replaceWith(realBox);

          const textarea = realBox.querySelector("textarea");
          textarea.value = "Auto-message on insert";
          sendMessage(textarea);
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
