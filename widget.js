(function() {
  // ════════════════════════════════════════
  // CONFIG — Change this to your public server URL
  // ════════════════════════════════════════
  var SERVER = window.IRIS_SERVER || "";

  // Detect script src to auto-resolve server URL
  (function autoDetectServer() {
    if (SERVER) return;
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (src.indexOf("widget.js") > -1) {
        // e.g. "https://myserver.com/widget.js" → "https://myserver.com"
        SERVER = src.substring(0, src.lastIndexOf("/"));
        break;
      }
    }
  })();

  // ════════════════════════════════════════
  // INJECT STYLES
  // ════════════════════════════════════════
  var css = `
    #iris-widget *{box-sizing:border-box;margin:0;padding:0;}
    #iris-widget{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.4;z-index:99999;}

    .iris-fab{position:fixed;bottom:28px;left:28px;display:flex;align-items:center;gap:10px;padding:16px 30px 16px 22px;background:#1a1a2e;border:none;border-radius:50px;cursor:pointer;z-index:99999;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 16px rgba(0,0,0,.3);}
    .iris-fab:hover{transform:scale(1.05);box-shadow:0 6px 24px rgba(0,0,0,.4);}
    .iris-fab-logo{width:44px;height:44px;flex-shrink:0;}
    .iris-fab-logo img{width:100%;height:100%;object-fit:contain;}
    .iris-fab-label{font-size:18px;font-weight:700;color:#fff;letter-spacing:.02em;white-space:nowrap;}

    .iris-tooltip{position:fixed;bottom:88px;left:28px;background:#fff;color:#333;padding:10px 16px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.12);font-size:13px;max-width:220px;z-index:99998;transition:opacity .3s,transform .3s;}
    .iris-tooltip::after{content:"";position:absolute;bottom:-6px;left:28px;width:12px;height:12px;background:#fff;transform:rotate(45deg);box-shadow:2px 2px 4px rgba(0,0,0,.06);}
    .iris-tooltip.hidden{opacity:0;transform:translateY(8px);pointer-events:none;}

    .iris-chat{position:fixed;bottom:90px;left:28px;width:400px;height:540px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.15);display:flex;flex-direction:column;overflow:hidden;z-index:100000;transition:opacity .25s,transform .25s;}
    .iris-chat.hidden{opacity:0;transform:translateY(20px) scale(.95);pointer-events:none;}

    .iris-header{background:linear-gradient(135deg,#1e3a5f 0%,#3e8ccb 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}
    .iris-header h1{font-size:15px;font-weight:600;color:#fff;}
    .iris-header p{font-size:11px;opacity:.85;margin-top:1px;color:#fff;}
    .iris-status-dot{width:7px;height:7px;border-radius:50%;background:#34d399;display:inline-block;margin-right:3px;vertical-align:middle;}
    .iris-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.7);font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .15s;}
    .iris-close:hover{color:#fff;background:rgba(255,255,255,.15);}

    .iris-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
    .iris-messages::-webkit-scrollbar{width:4px;}
    .iris-messages::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px;}

    .iris-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.55;word-wrap:break-word;}
    .iris-msg-bot{background:#f0f4f8;color:#1a1a1a;align-self:flex-start;border-bottom-left-radius:4px;}
    .iris-msg-user{background:#3e8ccb;color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}
    .iris-msg-bot p{margin-bottom:6px;}.iris-msg-bot p:last-child{margin-bottom:0;}
    .iris-msg-bot ul,.iris-msg-bot ol{margin:4px 0 6px 16px;}.iris-msg-bot li{margin-bottom:2px;}
    .iris-msg-bot strong{font-weight:600;}
    .iris-msg-bot code{background:#e2e8f0;padding:1px 5px;border-radius:4px;font-size:12px;}
    .iris-msg-bot h3{font-size:13px;font-weight:600;margin:6px 0 3px;}

    .iris-typing{display:flex;gap:4px;padding:10px 14px;align-self:flex-start;}
    .iris-typing span{width:7px;height:7px;border-radius:50%;background:#bbb;animation:iris-bounce .6s infinite alternate;}
    .iris-typing span:nth-child(2){animation-delay:.15s;}
    .iris-typing span:nth-child(3){animation-delay:.3s;}
    @keyframes iris-bounce{to{opacity:.3;transform:translateY(-4px);}}

    .iris-qr{display:flex;flex-wrap:wrap;gap:5px;padding:0 14px 6px;flex-shrink:0;}
    .iris-qr-btn{padding:5px 10px;font-size:11px;border:1px solid #d1d5db;border-radius:20px;background:#fff;color:#374151;cursor:pointer;transition:all .15s;}
    .iris-qr-btn:hover{background:#f0f4f8;border-color:#3e8ccb;color:#3e8ccb;}

    .iris-input-area{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #e5e7eb;background:#fafafa;flex-shrink:0;}
    .iris-input-area input{flex:1;padding:9px 12px;border:1px solid #d1d5db;border-radius:24px;font-size:13px;outline:none;background:#fff;color:#111;}
    .iris-input-area input:focus{border-color:#3e8ccb;}
    .iris-input-area input:disabled{opacity:.5;}
    .iris-send{width:36px;height:36px;border-radius:50%;border:none;background:#3e8ccb;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;}
    .iris-send:hover{background:#2d6fa3;}
    .iris-send:disabled{opacity:.4;cursor:not-allowed;}

    .iris-action-card{align-self:flex-start;max-width:92%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font-size:12px;overflow-x:auto;}
    .iris-action-card-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
    .iris-dot{width:6px;height:6px;border-radius:50%;display:inline-block;}
    .iris-dot-ok{background:#22c55e;}.iris-dot-err{background:#ef4444;}
    .iris-action-table{width:100%;border-collapse:collapse;font-size:12px;}
    .iris-action-table th{text-align:left;padding:4px 8px;background:#e2e8f0;font-weight:600;color:#334155;font-size:11px;}
    .iris-action-table td{padding:4px 8px;border-bottom:1px solid #f1f5f9;color:#475569;}
    .iris-action-table tr:last-child td{border-bottom:none;}
    .iris-action-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;}
    .iris-action-kv dt{font-weight:600;color:#475569;}.iris-action-kv dd{color:#1e293b;margin:0;}
    .iris-action-error{background:#fef2f2;border-color:#fecaca;color:#991b1b;padding:10px 12px;border-radius:8px;}

    @media(max-width:480px){
      .iris-chat{bottom:0;right:0;width:100%;height:100%;border-radius:0;}
      .iris-fab{bottom:16px;left:16px;}
      .iris-tooltip{bottom:72px;left:16px;}
    }
  `;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ════════════════════════════════════════
  // INJECT HTML
  // ════════════════════════════════════════
  var logoUrl = SERVER + "/iristel-logo.svg";
  var container = document.createElement("div");
  container.id = "iris-widget";
  container.innerHTML = `
    <button class="iris-fab" id="irisFab">
      <div class="iris-fab-logo"><img src="${logoUrl}" alt="Iristel" /></div>
      <span class="iris-fab-label">Ask AI</span>
    </button>
    <div class="iris-tooltip" id="irisTooltip">Hi! I'm Iristel. Need help finding the right plan?</div>
    <div class="iris-chat hidden" id="irisChat">
      <div class="iris-header">
        <div>
          <h1>Iristel</h1>
          <p><span class="iris-status-dot"></span>Sales Assistant</p>
        </div>
        <button class="iris-close" id="irisClose">&times;</button>
      </div>
      <div class="iris-messages" id="irisMessages"></div>
      <div class="iris-qr" id="irisQR">
        <button class="iris-qr-btn">Show available plans</button>
        <button class="iris-qr-btn">Compare Smart Connect bundles</button>
        <button class="iris-qr-btn">Search phone numbers in Toronto</button>
        <button class="iris-qr-btn">Get a quote</button>
        <button class="iris-qr-btn" id="irisSummarizeBtn">Summarize this page</button>
      </div>
      <div class="iris-input-area">
        <input type="text" id="irisInput" placeholder="Ask Iristel anything..." autocomplete="off" />
        <button class="iris-send" id="irisSend">&#x27A4;</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ════════════════════════════════════════
  // REFS
  // ════════════════════════════════════════
  var fab       = document.getElementById("irisFab");
  var tooltip   = document.getElementById("irisTooltip");
  var chatWin   = document.getElementById("irisChat");
  var closeBtn  = document.getElementById("irisClose");
  var msgArea   = document.getElementById("irisMessages");
  var inputEl   = document.getElementById("irisInput");
  var sendBtn   = document.getElementById("irisSend");
  var qrArea    = document.getElementById("irisQR");
  var sumBtn    = document.getElementById("irisSummarizeBtn");

  var history = [];
  var busy = false;
  var chatOpened = false;

  // Auto-hide tooltip
  setTimeout(function() { tooltip.classList.add("hidden"); }, 6000);

  // ════════════════════════════════════════
  // TOGGLE
  // ════════════════════════════════════════
  function toggleChat() {
    var isHidden = chatWin.classList.contains("hidden");
    chatWin.classList.toggle("hidden");
    fab.classList.toggle("open", isHidden);
    tooltip.classList.add("hidden");
    if (isHidden) {
      if (!chatOpened) {
        chatOpened = true;
        addBotMessage("Hi! I'm **Iristel**, your sales assistant.\n\nI can help you find the right unified communications solution for your business. Ask me about **Smart Connect Bundles**, **Hosted PBX & Webex**, or **Cloud Contact Center** solutions!");
      }
      setTimeout(function() { inputEl.focus(); }, 100);
    }
  }

  fab.onclick = toggleChat;
  closeBtn.onclick = toggleChat;

  // ════════════════════════════════════════
  // INPUT
  // ════════════════════════════════════════
  inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !busy) send();
  });
  sendBtn.onclick = function() { if (!busy) send(); };

  // Quick replies
  qrArea.addEventListener("click", function(e) {
    if (e.target.classList.contains("iris-qr-btn") && e.target.id !== "irisSummarizeBtn") {
      inputEl.value = e.target.textContent;
      send();
    }
  });
  sumBtn.onclick = function() { summarizeCurrentPage(); };

  // ════════════════════════════════════════
  // SEND MESSAGE
  // ════════════════════════════════════════
  function send() {
    var text = inputEl.value.trim();
    if (!text || busy) return;

    busy = true;
    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    qrArea.style.display = "none";

    addUserMessage(text);
    history.push({ role: "user", content: text });

    var typingEl = showTyping();

    fetch(SERVER + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    })
    .then(function(res) {
      if (!res.ok) throw new Error("Server error " + res.status);
      return res.json();
    })
    .then(function(data) {
      var reply = data.reply;
      typingEl.remove();

      if (reply.includes("[SUMMARIZE_PAGE]")) {
        addBotMessage("Let me summarize this page for you...");
        doSummarizeCurrentPage();
      } else if (reply.match(/\[SUMMARIZE_URL:(https?:\/\/[^\]]+)\]/)) {
        var url = reply.match(/\[SUMMARIZE_URL:(https?:\/\/[^\]]+)\]/)[1];
        addBotMessage("Let me summarize that page for you...");
        doSummarizeUrl(url);
      } else if (data.action) {
        if (reply) addBotMessage(reply);
        renderActionResult(data.action);
        if (data.action.followUp) addBotMessage(data.action.followUp);
        var resultSummary = data.action.result.error
          ? "[System: Action " + data.action.name + " failed: " + JSON.stringify(data.action.result.data || data.action.result.message) + "]"
          : "[System: Action " + data.action.name + " succeeded. Result: " + JSON.stringify(data.action.result.data).slice(0, 500) + "]";
        history.push({ role: "assistant", content: (reply || "") + "\n" + resultSummary });
      } else {
        addBotMessage(reply);
        history.push({ role: "assistant", content: reply });
      }
      unlock();
    })
    .catch(function(err) {
      typingEl.remove();
      addBotMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment.");
      console.error("Iris chat error:", err);
      unlock();
    });
  }

  function unlock() {
    busy = false;
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  // ════════════════════════════════════════
  // SUMMARIZE
  // ════════════════════════════════════════
  function summarizeCurrentPage() {
    if (busy) return;
    busy = true;
    inputEl.disabled = true;
    sendBtn.disabled = true;
    qrArea.style.display = "none";

    addUserMessage("Summarize this page");
    history.push({ role: "user", content: "Summarize this page" });
    doSummarizeCurrentPage();
  }

  function doSummarizeCurrentPage() {
    var typingEl = showTyping();
    var pageUrl = window.location.href;

    fetch(SERVER + "/api/features/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: pageUrl })
    })
    .then(function(res) {
      if (!res.ok) throw new Error("url-failed");
      return res.json();
    })
    .then(function(data) {
      typingEl.remove();
      var msg = "**Page Summary: " + data.title + "**\n\n" + data.summary;
      addBotMessage(msg);
      history.push({ role: "assistant", content: msg });
      unlock();
    })
    .catch(function() {
      // Fallback: send page text to the server
      var pageText = document.body.innerText || "";
      fetch(SERVER + "/api/features/summarize/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pageText.slice(0, 10000), context: pageUrl })
      })
      .then(function(res) {
        if (!res.ok) throw new Error("text-failed");
        return res.json();
      })
      .then(function(data) {
        typingEl.remove();
        var msg = "**Page Summary**\n\n" + data.summary;
        addBotMessage(msg);
        history.push({ role: "assistant", content: msg });
        unlock();
      })
      .catch(function(err) {
        typingEl.remove();
        addBotMessage("Sorry, I couldn't summarize this page.");
        console.error("Iris summarize error:", err);
        unlock();
      });
    });
  }

  function doSummarizeUrl(url) {
    var typingEl = showTyping();
    fetch(SERVER + "/api/features/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    })
    .then(function(res) {
      if (!res.ok) throw new Error("failed");
      return res.json();
    })
    .then(function(data) {
      typingEl.remove();
      var msg = "**Summary: " + data.title + "**\n\n" + data.summary;
      addBotMessage(msg);
      history.push({ role: "assistant", content: msg });
      unlock();
    })
    .catch(function(err) {
      typingEl.remove();
      addBotMessage("Sorry, I couldn't summarize that page.");
      console.error("Iris summarize URL error:", err);
      unlock();
    });
  }

  // ════════════════════════════════════════
  // RENDER HELPERS
  // ════════════════════════════════════════
  function addUserMessage(text) {
    var div = document.createElement("div");
    div.className = "iris-msg iris-msg-user";
    div.textContent = text;
    msgArea.appendChild(div);
    scrollBottom();
  }

  function addBotMessage(text) {
    var div = document.createElement("div");
    div.className = "iris-msg iris-msg-bot";
    div.innerHTML = renderMarkdown(text);
    msgArea.appendChild(div);
    scrollBottom();
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "iris-typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    msgArea.appendChild(div);
    scrollBottom();
    return div;
  }

  function scrollBottom() {
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function renderMarkdown(text) {
    return text
      .replace(/```([\s\S]*?)```/g, '<pre style="background:#f1f5f9;padding:8px 10px;border-radius:6px;font-size:12px;overflow-x:auto;"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .split(/\n\n+/)
      .map(function(p) {
        p = p.trim();
        if (!p) return "";
        if (p.charAt(0) === "<" && (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<pre") || p.startsWith("<li"))) return p;
        return "<p>" + p.replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  // ════════════════════════════════════════
  // ACTION RESULT RENDERER
  // ════════════════════════════════════════
  function renderActionResult(action) {
    var name = action.name;
    var result = action.result;
    var div = document.createElement("div");
    div.className = "iris-action-card";

    if (result.error) {
      div.classList.add("iris-action-error");
      div.innerHTML = '<div class="iris-action-card-title"><span class="iris-dot iris-dot-err"></span> Something went wrong</div>' +
        '<p>Sorry, we couldn\'t complete that request. Please try again or contact our sales team.</p>';
      msgArea.appendChild(div);
      scrollBottom();
      return;
    }

    var data = result.data;
    var html = '';

    if (name === "create_quote" && data.proposalId) {
      var ok = data.success;
      html = '<div class="iris-action-card-title"><span class="iris-dot ' + (ok ? "iris-dot-ok" : "iris-dot-err") + '"></span> ' + (ok ? "Proposal Sent" : "Proposal Created") + '</div>';
      html += '<p style="font-size:13px;color:#334155;margin-bottom:8px;">';
      if (ok) {
        html += 'Your proposal has been created and emailed to <strong>' + (data.clientEmail || "the client") + '</strong>.';
      } else {
        html += 'Your proposal was created but there may have been an issue sending the email. Our team has been notified.';
      }
      html += '</p>';
      // Show products in a friendly way — names only, no IDs
      if (data.products && data.products.length) {
        html += '<p style="font-size:12px;font-weight:600;color:#475569;margin:0 0 4px;">Included products:</p>';
        html += '<ul style="font-size:12px;color:#475569;margin:0 0 8px;padding-left:16px;">';
        data.products.forEach(function(p) {
          var period = p.period === "one-time" ? " (one-time)" : "/mo";
          html += '<li>' + p.name + ' — $' + p.price + period + '</li>';
        });
        html += '</ul>';
      }
      html += '<p style="font-size:12px;color:#64748b;margin:0;">Please check your inbox for the full proposal with pricing details.</p>';
    } else {
      // Generic friendly fallback — no raw data
      html = '<div class="iris-action-card-title"><span class="iris-dot iris-dot-ok"></span> Done</div>';
      html += '<p style="font-size:13px;color:#334155;">Your request has been processed successfully.</p>';
    }

    div.innerHTML = html;
    msgArea.appendChild(div);
    scrollBottom();
  }


})();
