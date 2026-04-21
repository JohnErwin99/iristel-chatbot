const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// ── CORS — allow the widget to be embedded on any site ──
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Config ──
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";
const PORT = process.env.PORT || 3000;

// ── Mount feature microservices ──
const summarizeRouter = require("./features/summarize");
app.use("/api/features/summarize", summarizeRouter);

const iristelxRouter = require("./features/iristelx");
app.use("/api/iristelx", iristelxRouter);

const quoterRouter = require("./features/quoter");
app.use("/api/features/quoter", quoterRouter);

// ── Load knowledge bases ──
const services = JSON.parse(fs.readFileSync(path.join(__dirname, "services.json"), "utf8"));
const apiSpec = JSON.parse(fs.readFileSync(path.join(__dirname, "features/iristelx/api-spec.json"), "utf8"));

function buildSystemPrompt() {
  let prompt = `You are Iris, a friendly and knowledgeable sales assistant for Iristel — a Canadian unified communications provider.

Your role:
- Help visitors understand Iristel's products and find the right solution for their business
- Answer questions about pricing, features, and service comparisons
- When a customer is ready, recommend specific products and offer to generate a quote
- Be concise, warm, and professional. Use short paragraphs.
- Always quote prices in CAD (Canadian dollars)
- If you don't know something specific, say so honestly and suggest they contact sales
- You can perform REAL transactions on the Iristel-X platform when users ask

IMPORTANT RULES:
- Never invent products, features, or prices that aren't in your knowledge base below
- When comparing plans, use a clear format (bullet points or short table)
- If someone needs something outside your product catalog, acknowledge it and suggest contacting Iristel sales directly
- When a visitor seems ready to buy, ask if they'd like you to prepare a quote and collect: company name, contact name, email, and number of users
- For transactional actions, ALWAYS confirm with the user before executing. Show them what you're about to do.

Here is your complete product and pricing knowledge base:

`;

  for (const [groupKey, group] of Object.entries(services.product_groups)) {
    prompt += `\n## ${group.name}\n${group.description}\n\n`;
    for (const product of group.products) {
      const priceLabel = product.period === "one-time"
        ? `$${product.price} one-time (${product.unit})`
        : `$${product.price}/month (${product.unit})`;
      prompt += `### ${product.name} — ${priceLabel}\n`;
      prompt += `Features: ${product.features.join(", ")}\n\n`;
    }
  }

  prompt += `\n## General Info\n`;
  prompt += `- All prices are in CAD\n`;
  prompt += `- Monthly prices are per-user unless noted otherwise\n`;
  prompt += `- Smart Connect Bundles are all-in-one packages (voice + collaboration + security + messaging)\n`;
  prompt += `- The "New!" bundles are the latest versions with updated features\n`;
  prompt += `- Cloud Contact is for formal contact/call center environments\n`;
  prompt += `- Hosted PBX is for traditional business phone systems with optional Webex collaboration\n`;
  prompt += `- Iristel provides Canadian & US calling, DID numbers, and PSTN connectivity\n`;

  prompt += `\n## Special Abilities\n`;
  prompt += `- You can summarize any page on the Iristel website. If a user asks you to summarize a page or says "summarize this page", respond with exactly: [SUMMARIZE_PAGE] and the system will handle it.\n`;
  prompt += `- If a user provides a specific iristel.com URL and asks for a summary, respond with exactly: [SUMMARIZE_URL:https://iristel.com/the-page] replacing the URL with the one they gave.\n`;
  prompt += `- After the summary is provided, you can discuss it naturally and answer follow-up questions.\n`;

  // Transactional capabilities
  prompt += `\n## Transactional API Actions (Iristel-X Platform)\n`;
  prompt += `You can perform real actions on the Iristel-X platform by responding with special action tags.\n`;
  prompt += `The system will execute the API call and show results to the user.\n\n`;
  prompt += `IMPORTANT: For any action that creates, modifies, or deletes data, you MUST first confirm with the user.\n`;
  prompt += `For read-only actions (viewing plans, accounts, balance, usage), you can proceed directly.\n\n`;
  prompt += `To trigger an action, include EXACTLY one of these tags in your response (on its own line):\n\n`;

  prompt += `### Read Actions (no confirmation needed)\n`;
  prompt += `[ACTION:list_plans] — Show available mobile/data plans. Optional params: billingTypes=prepaid|postpaid|prepaid_ppu, status=1|0\n`;
  prompt += `[ACTION:list_plans?billingTypes=prepaid&status=1] — With filters\n`;
  prompt += `[ACTION:get_plan?planCode=XXXX] — Get specific plan details\n`;
  prompt += `[ACTION:list_accounts] — List accounts. Optional: query=search, status=active, page=1, pageLimit=10\n`;
  prompt += `[ACTION:list_accounts?query=john&status=active] — Search accounts\n`;
  prompt += `[ACTION:get_account?accountId=XXXX] — Get specific account\n`;
  prompt += `[ACTION:list_services?accountId=XXXX] — List services on an account\n`;
  prompt += `[ACTION:get_usage?accountId=XXXX&serviceId=YYYY&type=GPRS] — Get usage data. Types: GPRS, SMS OUT, SMS INC, MOBILE OUT, MOBILE INC, VOIP\n`;
  prompt += `[ACTION:get_usage?accountId=XXXX&serviceId=YYYY&type=GPRS&fromDate=2024-01-01&toDate=2024-12-31] — Usage with date range\n`;
  prompt += `[ACTION:view_balance?accountId=XXXX] — Check account balance\n`;
  prompt += `[ACTION:list_invoices?accountId=XXXX] — View invoices. Optional: status=0(unpaid)|2(paid), fromDate, toDate\n`;
  prompt += `[ACTION:search_numbers?city=Toronto] — Search available phone numbers. Optional: province, areaCode, country\n`;
  prompt += `[ACTION:get_cities] — Get available cities for phone numbers\n`;
  prompt += `[ACTION:check_portability?areaCode=905&exchangeCode=840] — Check if a number can be ported\n`;
  prompt += `[ACTION:list_port_requests] — List porting requests\n`;

  prompt += `\n### Write Actions (ALWAYS confirm with user first)\n`;
  prompt += `[ACTION:create_account|BODY] — Create account. BODY is JSON: {"contact":{"fname":"","lname":"","address1":"","city":"","province":"ON","country":"CA","postalCode":"A1A1A1","emailAddress":""},"language":"EN"}\n`;
  prompt += `[ACTION:add_service|BODY] — Add service. Needs accountId in body: {"accountId":"XXX","planCode":"XXX","contact":{...}}\n`;
  prompt += `[ACTION:update_service|BODY] — Update service status. Body: {"accountId":"XXX","serviceId":"YYY","status":"ACTIVE|SUSPENDED|CLOSED"}\n`;
  prompt += `[ACTION:add_payment|BODY] — Record payment. Body: {"accountId":"XXX","paymentMethod":"CASH|CREDITCARD|...","amount":100,"currency":"CAD"}\n`;
  prompt += `[ACTION:reserve_number|BODY] — Reserve numbers. Body: {"telephoneNumbers":[...]}\n`;
  prompt += `[ACTION:create_port_request|BODY] — Port a number. Body: {"telephoneNumber":"","providerName":"","providerAccountNumber":"","desiredDueDate":"YYYY-MM-DD","serviceType":"Wireless|Wireline","fullName":"","streetNumber":"","streetName":"","city":"","province":"","postalCode":"","serviceId":""}\n`;
  prompt += `[ACTION:create_quote|BODY] — Create a full proposal in NiftyQuoter and email it to the client + notify team. Body: {"clientName":"John Smith","clientEmail":"john@company.com","companyName":"Acme Corp","products":["sc_pro_new","pbx_webex_standard"],"quantity":10,"proposalName":"Smart Connect Quote"}\n`;
  prompt += `\nAvailable product IDs for quotes:\n`;
  prompt += `Cloud Contact: cc_core_voice ($80/mo), cc_omni_channel ($110/mo), cc_setup_fee ($4000 once), cc_recording_ai ($7/mo), cc_custom_dev ($200/hr)\n`;
  prompt += `Smart Connect: sc_essentials_new ($25/mo), sc_pro_new ($45/mo), sc_premium_new ($75/mo), sc_essentials ($23/mo), sc_pro ($33/mo), sc_premium ($63/mo)\n`;
  prompt += `Hosted PBX: pbx_unite ($20/mo), pbx_webex_basic ($24/mo), pbx_webex_standard ($29/mo), pbx_webex_premium ($46/mo), pbx_common_area ($10/mo), pbx_auto_attendant ($30/mo), pbx_user_activation ($25 once), pbx_aa_activation ($50 once), pbx_call_queue_basic ($10/mo), pbx_call_queue_premium ($20/mo), pbx_virtual_fwd ($10/mo), pbx_virtual_vm ($15/mo), pbx_hunt_group ($5/mo), pbx_sms_webex ($7/mo), pbx_key_system ($10/mo), pbx_cloud_connect ($10/mo)\n`;

  prompt += `\n### Conversation Flow for Transactions\n`;
  prompt += `1. User asks to do something (e.g., "create an account", "check my balance", "show available plans")\n`;
  prompt += `2. For read actions: immediately include the action tag and explain what you're looking up\n`;
  prompt += `3. For write actions: collect all required info first, show a summary, ask for confirmation\n`;
  prompt += `4. Once confirmed, include the action tag with the JSON body\n`;
  prompt += `5. The system will execute and return results — present them clearly to the user\n`;

  return prompt;
}

const SYSTEM_PROMPT = buildSystemPrompt();

// ════════════════════════════════════════
// ACTION EXECUTOR — processes [ACTION:xxx] tags from LLM
// ════════════════════════════════════════
async function executeAction(actionStr) {
  // Parse: [ACTION:action_name?param=val&param2=val2] or [ACTION:action_name|JSON_BODY]
  let actionName, params = {}, body = null;

  const pipeIdx = actionStr.indexOf("|");
  if (pipeIdx > -1) {
    actionName = actionStr.substring(0, pipeIdx);
    try {
      body = JSON.parse(actionStr.substring(pipeIdx + 1));
    } catch (e) {
      return { error: true, message: "Invalid JSON in action body: " + e.message };
    }
  } else {
    actionName = actionStr;
  }

  // Extract query params from action name
  const qIdx = actionName.indexOf("?");
  if (qIdx > -1) {
    const qs = actionName.substring(qIdx + 1);
    actionName = actionName.substring(0, qIdx);
    for (const pair of qs.split("&")) {
      const [k, v] = pair.split("=");
      if (k) params[k] = decodeURIComponent(v || "");
    }
  }

  const SERVER_BASE = `http://localhost:${PORT}/api/iristelx`;

  try {
    let url, method = "GET", fetchBody = null;

    switch (actionName) {
      // ── Read actions ──
      case "list_plans": {
        url = `${SERVER_BASE}/plans?billingTypes=${params.billingTypes || ""}&status=${params.status || ""}`;
        break;
      }
      case "get_plan": {
        url = `${SERVER_BASE}/plans/${params.planCode}`;
        break;
      }
      case "list_accounts": {
        const qp = new URLSearchParams();
        if (params.query) qp.set("query", params.query);
        if (params.status) qp.set("status", params.status);
        if (params.page) qp.set("page", params.page);
        if (params.pageLimit) qp.set("pageLimit", params.pageLimit);
        url = `${SERVER_BASE}/accounts?${qp}`;
        break;
      }
      case "get_account": {
        url = `${SERVER_BASE}/accounts/${params.accountId}`;
        break;
      }
      case "list_services": {
        url = params.accountId
          ? `${SERVER_BASE}/accounts/${params.accountId}/services`
          : `${SERVER_BASE}/accounts/services`;
        break;
      }
      case "get_usage": {
        const qp = new URLSearchParams();
        if (params.type) qp.set("type", params.type);
        if (params.fromDate) qp.set("fromDate", params.fromDate);
        if (params.toDate) qp.set("toDate", params.toDate);
        if (params.invoiceId) qp.set("invoiceId", params.invoiceId);
        url = `${SERVER_BASE}/accounts/${params.accountId}/services/${params.serviceId}/usage?${qp}`;
        break;
      }
      case "view_balance": {
        url = `${SERVER_BASE}/billing/${params.accountId}/balance`;
        break;
      }
      case "list_invoices": {
        const qp = new URLSearchParams();
        if (params.status) qp.set("status", params.status);
        if (params.fromDate) qp.set("fromDate", params.fromDate);
        if (params.toDate) qp.set("toDate", params.toDate);
        url = `${SERVER_BASE}/billing/${params.accountId}/invoices?${qp}`;
        break;
      }
      case "search_numbers": {
        const qp = new URLSearchParams();
        if (params.city) qp.set("city", params.city);
        if (params.province) qp.set("province", params.province);
        if (params.areaCode) qp.set("areaCode", params.areaCode);
        if (params.country) qp.set("country", params.country);
        url = `${SERVER_BASE}/telephone-numbers/catalogue?${qp}`;
        break;
      }
      case "get_cities": {
        url = `${SERVER_BASE}/telephone-numbers/cities`;
        break;
      }
      case "check_portability": {
        url = `${SERVER_BASE}/porting/check?areaCode=${params.areaCode}&exchangeCode=${params.exchangeCode}`;
        break;
      }
      case "list_port_requests": {
        url = `${SERVER_BASE}/porting`;
        break;
      }

      // ── Write actions ──
      case "create_account": {
        url = `${SERVER_BASE}/accounts`;
        method = "POST";
        fetchBody = body;
        break;
      }
      case "add_service": {
        const acctId = body.accountId;
        delete body.accountId;
        url = `${SERVER_BASE}/accounts/${acctId}/services`;
        method = "POST";
        fetchBody = body;
        break;
      }
      case "update_service": {
        const { accountId: aId, serviceId: sId, ...rest } = body;
        url = `${SERVER_BASE}/accounts/${aId}/services/${sId}`;
        method = "PATCH";
        fetchBody = rest;
        break;
      }
      case "add_payment": {
        const { accountId: payAcct, ...payBody } = body;
        url = `${SERVER_BASE}/billing/${payAcct}/payments`;
        method = "POST";
        fetchBody = payBody;
        break;
      }
      case "reserve_number": {
        url = `${SERVER_BASE}/telephone-numbers/reserve`;
        method = "POST";
        fetchBody = body;
        break;
      }
      case "create_port_request": {
        url = `${SERVER_BASE}/porting`;
        method = "POST";
        fetchBody = body;
        break;
      }
      case "create_quote": {
        url = `http://localhost:${PORT}/api/features/quoter/create`;
        method = "POST";
        fetchBody = body;
        break;
      }

      default:
        return { error: true, message: `Unknown action: ${actionName}` };
    }

    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (fetchBody) opts.body = JSON.stringify(fetchBody);

    const res = await fetch(url, opts);
    const data = await res.json();
    return { error: !res.ok, status: res.status, action: actionName, data };
  } catch (err) {
    return { error: true, message: err.message };
  }
}

// ── Chat endpoint (with action execution) ──
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch(GROQ_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", response.status, err);
      return res.status(response.status).json({ error: "LLM API error", details: err });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    // Check for action tags in the reply
    const actionMatch = reply.match(/\[ACTION:([^\]]+)\]/);
    if (actionMatch) {
      const actionStr = actionMatch[1];
      const textBefore = reply.substring(0, actionMatch.index).trim();
      const textAfter = reply.substring(actionMatch.index + actionMatch[0].length).trim();

      // Execute the action
      const actionResult = await executeAction(actionStr);

      res.json({
        reply: textBefore || "Processing your request...",
        action: {
          name: actionStr.split("?")[0].split("|")[0],
          result: actionResult,
          followUp: textAfter
        }
      });
      return;
    }

    // ── Fallback: detect quote intent when LLM doesn't emit [ACTION:] ──
    const convoText = messages.map(m => m.content).join("\n") + "\n" + reply;
    const quoteIntent = /\b(creat|generat|send|prepar|make|build)\w*\s+(a\s+)?(quote|proposal)\b/i.test(convoText);

    if (quoteIntent && !reply.includes("[ACTION:")) {
      // Check if conversation has enough info to create a quote
      const hasEmail = convoText.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
      const hasProduct = Object.keys(require("./features/quoter").PRODUCTS || {}).length > 0;

      if (hasEmail) {
        // Use a focused extraction prompt
        try {
          const extractRes = await fetch(GROQ_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + GROQ_API_KEY
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              messages: [{
                role: "system",
                content: `You are a JSON extraction tool. Extract quote details from the conversation below.
Return ONLY valid JSON, nothing else. No markdown, no explanation.
Format: {"clientName":"","clientEmail":"","companyName":"","products":[],"quantity":1}

Available product IDs:
Cloud Contact: cc_core_voice, cc_omni_channel, cc_setup_fee, cc_recording_ai, cc_custom_dev
Smart Connect: sc_essentials_new, sc_pro_new, sc_premium_new, sc_essentials, sc_pro, sc_premium
Hosted PBX: pbx_unite, pbx_webex_basic, pbx_webex_standard, pbx_webex_premium, pbx_common_area, pbx_auto_attendant, pbx_user_activation, pbx_aa_activation, pbx_call_queue_basic, pbx_call_queue_premium, pbx_virtual_fwd, pbx_virtual_vm, pbx_hunt_group, pbx_sms_webex, pbx_key_system, pbx_cloud_connect

Match product names to IDs. If "Pro Smart Connect" → sc_pro_new. If "Webex Standard" → pbx_webex_standard. etc.
If quantity is not mentioned, use 1.
If company name is not mentioned, use "".
clientName and clientEmail are required — if missing, return {"error":"missing_info","missing":["clientName"]} etc.`
              }, {
                role: "user",
                content: convoText.slice(-3000)
              }]
            })
          });

          if (extractRes.ok) {
            const extractData = await extractRes.json();
            const extractText = (extractData.choices?.[0]?.message?.content || "").trim();
            // Try to parse JSON from the response
            const jsonMatch = extractText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const quoteData = JSON.parse(jsonMatch[0]);
              if (quoteData.error === "missing_info") {
                // Not enough info yet — let Iris's response stand
                res.json({ reply });
                return;
              }
              if (quoteData.clientName && quoteData.clientEmail && quoteData.products?.length) {
                // Execute the quote
                const actionResult = await executeAction("create_quote|" + JSON.stringify(quoteData));
                res.json({
                  reply: reply,
                  action: {
                    name: "create_quote",
                    result: actionResult,
                    followUp: ""
                  }
                });
                return;
              }
            }
          }
        } catch (extractErr) {
          console.error("Quote extraction fallback error:", extractErr);
        }
      }
    }

    res.json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Iristel chatbot server running at http://localhost:${PORT}`);
  console.log(`LLM backend: Groq (${GROQ_MODEL})`);
  console.log(`Features:    summarize, iristelx-api, quoter`);
  console.log(`GROQ_API_KEY: ${GROQ_API_KEY ? "set" : "⚠ MISSING — set GROQ_API_KEY env var"}`);
});
