const express = require("express");
const router = express.Router();

// ── NiftyQuoter Config ──
const NQ_BASE = "https://api.niftyquoter.com/api/v1";
const API_KEY = "wSSeJNpsvBZlcApNhvlIHJmjdVvHq9VDbl5wf5RB";
const ACC_EMAIL = "jerwin@iristel.com";
const TEAM_NOTIFY = ["jerwin@iristel.com", "jayoub@iristel.com", "tkhei@iristel.com"];

const TEMPLATE_MAP = {
  cloud_contact: 26329,
  smart_connect: 49704,
  hosted_pbx: 45027
};

// Product catalog — same as index.html
const PRODUCTS = {
  // Cloud Contact
  cc_core_voice:       { name: "Cloud Contact - Core Voice",          price: "80",   period: "monthly",  group: "cloud_contact", description: "Manage all Inbound, Outbound, and Blended campaigns" },
  cc_omni_channel:     { name: "Cloud Contact - Omni Channel",       price: "110",  period: "monthly",  group: "cloud_contact", description: "Manage all interactions across every channel with the Unified Inbox" },
  cc_setup_fee:        { name: "Cloud Contact Set Up Fee",            price: "4000", period: "one-time", group: "cloud_contact", description: "One-time setup, configuration, implementation, and training" },
  cc_recording_ai:     { name: "Cloud Contact Call Recording AI",     price: "7",    period: "monthly",  group: "cloud_contact", description: "AI-powered call recording and analysis" },
  cc_custom_dev:       { name: "Custom Development (per hour)",       price: "200",  period: "one-time", group: "cloud_contact", description: "Custom development and integration work" },
  // Smart Connect
  sc_essentials_new:   { name: "Essentials Smart Connect Bundle New!",price: "25",   period: "monthly",  group: "smart_connect", description: "Cloud Calling, Webex Basic, Standard Call Recording, Virtual Fax, Eset Cybersecurity Training, Smarter Messaging Entry" },
  sc_pro_new:          { name: "Pro Smart Connect Bundle New!",       price: "45",   period: "monthly",  group: "smart_connect", description: "Cloud Calling, Standard Webex, Unified Capture Call Recording, Virtual Fax, Eset Cybersecurity Protect Advanced, Smarter Messaging Growth" },
  sc_premium_new:      { name: "Premium Smart Connect Bundle New!",   price: "75",   period: "monthly",  group: "smart_connect", description: "Cloud Calling, Standard Webex, Insights & AI Call Recording, Virtual Fax, Eset Cybersecurity Protect Advanced + training, Smarter Messaging Ultimate" },
  sc_essentials:       { name: "Essentials Smart Connect Bundle",     price: "23",   period: "monthly",  group: "smart_connect", description: "Cloud Calling, Standard Webex or Teams, Standard Call Recording, Virtual Fax, Cybersecurity Training, IP Vulnerability Scan, SMS" },
  sc_pro:              { name: "Pro Smart Connect Bundle",            price: "33",   period: "monthly",  group: "smart_connect", description: "Cloud Calling, Standard Webex or Teams, Unified Capture Call Recording, Virtual Fax 50pg, Cybersecurity Training, SMS 100 outgoing, IP Scan" },
  sc_premium:          { name: "Premium Smart Connect Bundle",        price: "63",   period: "monthly",  group: "smart_connect", description: "Cloud Calling, Standard Webex or Teams, Insights & AI Call Recording, Virtual Fax 200pg, Cybersecurity Training, SMS 300 outgoing, IP Scan" },
  // Hosted PBX
  pbx_unite:           { name: "Iristel Unite",                       price: "20",   period: "monthly",  group: "hosted_pbx", description: "Cloud Voice, Unlimited Canada & US Calling, DID, Auto Attendant, BLF" },
  pbx_webex_basic:     { name: "Iristel Unite with Webex Basic",      price: "24",   period: "monthly",  group: "hosted_pbx", description: "Cloud Voice + Webex Softphone, Messaging, File Sharing" },
  pbx_webex_standard:  { name: "Iristel Unite with Webex Standard",   price: "29",   period: "monthly",  group: "hosted_pbx", description: "Cloud Voice + Webex, Meeting Room (25 capacity)" },
  pbx_webex_premium:   { name: "Iristel Unite with Webex Premium",    price: "46",   period: "monthly",  group: "hosted_pbx", description: "Cloud Voice + Webex, Meeting Room (1000 capacity)" },
  pbx_common_area:     { name: "Common Area Extension",               price: "10",   period: "monthly",  group: "hosted_pbx", description: "Shared extension for common areas" },
  pbx_auto_attendant:  { name: "Auto-Attendant",                      price: "30",   period: "monthly",  group: "hosted_pbx", description: "Automated call routing and greeting" },
  pbx_user_activation: { name: "User Activation Fee",                 price: "25",   period: "one-time", group: "hosted_pbx", description: "One-time user activation fee" },
  pbx_aa_activation:   { name: "Auto-Attendant Activation Fee",       price: "50",   period: "one-time", group: "hosted_pbx", description: "One-time auto-attendant activation fee" },
  pbx_call_queue_basic:{ name: "Call Queue Basic (per agent)",         price: "10",   period: "monthly",  group: "hosted_pbx", description: "Simple call distribution and queuing" },
  pbx_call_queue_premium:{ name: "Call Queue Premium (per agent)",     price: "20",   period: "monthly",  group: "hosted_pbx", description: "Advanced routing, ACD states, disposition codes, outbound calling" },
  pbx_virtual_fwd:     { name: "Virtual Number with Call Forwarding",  price: "10",   period: "monthly",  group: "hosted_pbx", description: "Virtual DID number with call forwarding" },
  pbx_virtual_vm:      { name: "Virtual Number with VoiceMail",       price: "15",   period: "monthly",  group: "hosted_pbx", description: "Virtual DID number with voicemail" },
  pbx_hunt_group:      { name: "Hunt Group",                          price: "5",    period: "monthly",  group: "hosted_pbx", description: "Hunt group for call distribution" },
  pbx_sms_webex:       { name: "SMS For Webex",                       price: "7",    period: "monthly",  group: "hosted_pbx", description: "3500 ingoing and outgoing SMS in Canada & US" },
  pbx_key_system:      { name: "Key System User",                     price: "10",   period: "monthly",  group: "hosted_pbx", description: "Key system user extension" },
  pbx_cloud_connect:   { name: "Cloud Connect For Webex Calling",     price: "10",   period: "monthly",  group: "hosted_pbx", description: "Direct secure PSTN connectivity for Webex Calling" }
};

function authQS() {
  return "key=" + encodeURIComponent(API_KEY) + "&email=" + encodeURIComponent(ACC_EMAIL);
}

function pickTemplateId(productIds) {
  const counts = {};
  productIds.forEach(pid => {
    const g = PRODUCTS[pid]?.group;
    if (g) counts[g] = (counts[g] || 0) + 1;
  });
  let best = "smart_connect", max = 0;
  for (const g in counts) { if (counts[g] > max) { max = counts[g]; best = g; } }
  return TEMPLATE_MAP[best] || TEMPLATE_MAP.smart_connect;
}

/**
 * POST /api/features/quoter/create
 * Body: {
 *   clientName: "John Smith",
 *   clientEmail: "john@company.com",
 *   companyName: "Acme Corp",
 *   products: ["sc_pro_new", "pbx_webex_standard"],
 *   quantity: 10,
 *   proposalName: "Smart Connect Quote" (optional)
 * }
 */
router.post("/create", async (req, res) => {
  const { clientName, clientEmail, companyName, products, quantity, proposalName } = req.body;

  if (!clientName || !clientEmail || !products || !products.length) {
    return res.status(400).json({ error: "clientName, clientEmail, and products[] are required" });
  }

  const qty = quantity || 1;
  const validProducts = products.filter(pid => PRODUCTS[pid]);
  if (validProducts.length === 0) {
    return res.status(400).json({ error: "No valid product IDs provided", validIds: Object.keys(PRODUCTS) });
  }

  const steps = [];
  let proposalId = null;
  let proposalUrl = null;

  try {
    // ── 1. Create proposal ──
    const prodNames = validProducts.map(pid => PRODUCTS[pid].name).join(" + ");
    const fullName = (proposalName || "Quote") + (companyName ? " — " + companyName : "") + " — " + prodNames;
    const templateId = pickTemplateId(validProducts);

    const res1 = await fetch(NQ_BASE + "/proposals?" + authQS(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "proposal[name]": fullName,
        "proposal[load_template_id]": templateId.toString()
      }).toString()
    });

    const data1 = await res1.json().catch(() => null) || JSON.parse(await res1.text());
    proposalId = data1.proposal?.id || data1.id;
    if (!proposalId) throw new Error("No proposal ID returned");
    proposalUrl = "https://app.niftyquoter.com/proposals/" + proposalId + "/edit";
    steps.push({ step: "Create proposal", status: "ok", proposalId });

    // ── 2. Create client & attach ──
    const nameParts = clientName.trim().split(" ");
    let clientId = null;

    const resC = await fetch(NQ_BASE + "/clients?" + authQS(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "client[first_name]": nameParts[0] || "",
        "client[last_name]": nameParts.slice(1).join(" ") || "",
        "client[company_name]": companyName || "",
        "client[email]": clientEmail
      }).toString()
    });

    if (resC.ok) {
      const dataC = await resC.json();
      clientId = dataC.client?.id || dataC.id;
    } else {
      // Client may already exist — search by email
      const searchRes = await fetch(NQ_BASE + "/clients?" + authQS() + "&search=" + encodeURIComponent(clientEmail));
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const clients = searchData.clients || searchData;
        if (Array.isArray(clients) && clients.length > 0) {
          clientId = clients[0].id;
        }
      }
    }

    if (clientId) {
      await fetch(NQ_BASE + "/proposals/" + proposalId + "/contacts?" + authQS(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ "contact[client_id]": clientId }).toString()
      });
      steps.push({ step: "Create & attach client", status: "ok", clientId });
    } else {
      steps.push({ step: "Create client", status: "warning", detail: "Could not create or find client" });
    }

    // ── 3. Add line items ──
    const itemResults = [];
    for (let i = 0; i < validProducts.length; i++) {
      const pid = validProducts[i];
      const p = PRODUCTS[pid];
      const body = new URLSearchParams({
        "item[name]": p.name,
        "item[description]": p.description,
        "item[kind]": "item",
        "item[price]": p.price,
        "item[quantity]": qty.toString(),
        "item[vat]": "0.0",
        "item[price_vat]": p.price,
        "item[purchase_price]": p.price,
        "item[discount]": "",
        "item[discount_type]": "relative",
        "item[optional]": "false",
        "item[optional_checked]": "false",
        "item[period]": p.period === "monthly" ? "30" : p.period === "yearly" ? "365" : "",
        "item[position]": i.toString()
      });

      const resI = await fetch(NQ_BASE + "/proposals/" + proposalId + "/items?" + authQS(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });

      itemResults.push({ product: p.name, price: "$" + p.price, status: resI.ok ? "ok" : "failed" });
    }
    steps.push({ step: "Add line items", status: itemResults.every(r => r.status === "ok") ? "ok" : "partial", items: itemResults });

    // ── 4. Send email to client + CC team ──
    const emailSubject = "Your Iristel Proposal" + (companyName ? " — " + companyName : "");
    const emailBody = "Hi " + nameParts[0] + ",\n\nThank you for your interest! Please find your customized proposal attached.\n\nClick the link below to view your full proposal, review pricing, and approve directly online.\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,\nThe Iristel Team";

    const resEmail = await fetch(NQ_BASE + "/proposals/" + proposalId + "/send_email?" + authQS(), {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        "email_to": clientEmail,
        "email_subject": emailSubject,
        "email_body": emailBody,
        "email_attach_pdf": "true",
        "email_cc": TEAM_NOTIFY.join(",")
      }).toString()
    });

    steps.push({ step: "Send email + notify team", status: resEmail.ok ? "ok" : "failed" });

    // ── Response ──
    res.json({
      success: true,
      proposalId,
      proposalUrl,
      clientName,
      clientEmail,
      companyName: companyName || null,
      products: validProducts.map(pid => ({ id: pid, name: PRODUCTS[pid].name, price: PRODUCTS[pid].price, period: PRODUCTS[pid].period })),
      quantity: qty,
      steps
    });

  } catch (err) {
    console.error("Quote creation error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      proposalId,
      proposalUrl,
      steps
    });
  }
});

// GET /api/features/quoter/products — list all available products
router.get("/products", (req, res) => {
  const result = {};
  for (const [pid, p] of Object.entries(PRODUCTS)) {
    result[pid] = { name: p.name, price: p.price, period: p.period, group: p.group };
  }
  res.json(result);
});

router.PRODUCTS = PRODUCTS;
module.exports = router;
