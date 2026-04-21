const express = require("express");
const router = express.Router();

// ── Config ──
const API_BASE = process.env.IRISTELX_API_BASE || "https://api.iristelx.com";
const API_KEY = process.env.IRISTELX_API_KEY || "HRT88y2qywc6fwX779zG2D8fJtJQJbvz";

function apiHeaders() {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${API_KEY}`
  };
}

// Generic proxy helper
async function apiCall(method, path, body, query) {
  const url = new URL(path, API_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }

  const opts = { method, headers: apiHeaders() };
  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    return { error: true, status: res.status, data };
  }
  return { error: false, status: res.status, data };
}

// ════════════════════════════════════════
// PLANS
// ════════════════════════════════════════
router.get("/plans", async (req, res) => {
  const result = await apiCall("GET", "/plans", null, {
    billingTypes: req.query.billingTypes,
    status: req.query.status
  });
  res.status(result.status).json(result.data);
});

router.get("/plans/:planCode", async (req, res) => {
  const result = await apiCall("GET", `/plans/${req.params.planCode}`);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// ACCOUNTS
// ════════════════════════════════════════
router.post("/accounts", async (req, res) => {
  const result = await apiCall("POST", "/accounts", req.body);
  res.status(result.status).json(result.data);
});

router.get("/accounts", async (req, res) => {
  const result = await apiCall("GET", "/accounts", null, {
    query: req.query.query,
    agentId: req.query.agentId,
    status: req.query.status,
    page: req.query.page,
    pageLimit: req.query.pageLimit,
    sort: req.query.sort
  });
  res.status(result.status).json(result.data);
});

router.get("/accounts/:accountId", async (req, res) => {
  const result = await apiCall("GET", `/accounts/${req.params.accountId}`);
  res.status(result.status).json(result.data);
});

router.patch("/accounts/:accountId", async (req, res) => {
  const result = await apiCall("PATCH", `/accounts/${req.params.accountId}`, req.body);
  res.status(result.status).json(result.data);
});

router.get("/accounts/:accountId/log", async (req, res) => {
  const result = await apiCall("GET", `/accounts/${req.params.accountId}/log`);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// SERVICES
// ════════════════════════════════════════
router.get("/accounts/services", async (req, res) => {
  const result = await apiCall("GET", "/accounts/services", null, {
    query: req.query.query,
    serviceId: req.query.serviceId,
    status: req.query.status,
    page: req.query.page,
    pageLimit: req.query.pageLimit,
    sort: req.query.sort,
    planCode: req.query.planCode
  });
  res.status(result.status).json(result.data);
});

router.get("/accounts/:accountId/services", async (req, res) => {
  const result = await apiCall("GET", `/accounts/${req.params.accountId}/services`);
  res.status(result.status).json(result.data);
});

router.post("/accounts/:accountId/services", async (req, res) => {
  const result = await apiCall("POST", `/accounts/${req.params.accountId}/services`, req.body);
  res.status(result.status).json(result.data);
});

router.get("/accounts/:accountId/services/:serviceId", async (req, res) => {
  const result = await apiCall("GET", `/accounts/${req.params.accountId}/services/${req.params.serviceId}`);
  res.status(result.status).json(result.data);
});

router.patch("/accounts/:accountId/services/:serviceId", async (req, res) => {
  const result = await apiCall("PATCH", `/accounts/${req.params.accountId}/services/${req.params.serviceId}`, req.body);
  res.status(result.status).json(result.data);
});

router.delete("/accounts/:accountId/services/:serviceId", async (req, res) => {
  const result = await apiCall("DELETE", `/accounts/${req.params.accountId}/services/${req.params.serviceId}`);
  res.status(result.status).json(result.data);
});

// Service sub-actions
router.get("/accounts/:accountId/services/:serviceId/usage", async (req, res) => {
  const result = await apiCall("GET", `/accounts/${req.params.accountId}/services/${req.params.serviceId}/usage`, null, {
    type: req.query.type,
    invoiceId: req.query.invoiceId,
    date: req.query.date,
    fromDate: req.query.fromDate,
    toDate: req.query.toDate
  });
  res.status(result.status).json(result.data);
});

router.get("/accounts/:accountId/services/:serviceId/journal", async (req, res) => {
  const result = await apiCall("GET", `/accounts/${req.params.accountId}/services/${req.params.serviceId}/journal`);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// BILLING
// ════════════════════════════════════════
router.get("/billing/:accountId/balance", async (req, res) => {
  const result = await apiCall("GET", `/billing/${req.params.accountId}/balance`);
  res.status(result.status).json(result.data);
});

router.get("/billing/:accountId/invoices", async (req, res) => {
  const result = await apiCall("GET", `/billing/${req.params.accountId}/invoices`, null, {
    status: req.query.status,
    fromDate: req.query.fromDate,
    toDate: req.query.toDate
  });
  res.status(result.status).json(result.data);
});

router.get("/billing/:accountId/invoices/:invoiceId", async (req, res) => {
  const result = await apiCall("GET", `/billing/${req.params.accountId}/invoices/${req.params.invoiceId}`);
  res.status(result.status).json(result.data);
});

router.post("/billing/:accountId/payments", async (req, res) => {
  const result = await apiCall("POST", `/billing/${req.params.accountId}/payments`, req.body);
  res.status(result.status).json(result.data);
});

router.get("/billing/:accountId/payments", async (req, res) => {
  const result = await apiCall("GET", `/billing/${req.params.accountId}/payments`);
  res.status(result.status).json(result.data);
});

router.patch("/billing/:accountId/credit-card", async (req, res) => {
  const result = await apiCall("PATCH", `/billing/${req.params.accountId}/credit-card`, req.body);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// TELEPHONE NUMBERS
// ════════════════════════════════════════
router.get("/telephone-numbers/cities", async (req, res) => {
  const result = await apiCall("GET", "/telephone-numbers/cities");
  res.status(result.status).json(result.data);
});

router.get("/telephone-numbers/catalogue", async (req, res) => {
  const result = await apiCall("GET", "/telephone-numbers/catalogue", null, {
    city: req.query.city,
    province: req.query.province,
    country: req.query.country,
    areaCode: req.query.areaCode,
    exchangeCode: req.query.exchangeCode,
    lineNumber: req.query.lineNumber
  });
  res.status(result.status).json(result.data);
});

router.post("/telephone-numbers/reserve", async (req, res) => {
  const result = await apiCall("POST", "/telephone-numbers/reserve", req.body);
  res.status(result.status).json(result.data);
});

router.post("/telephone-numbers/release", async (req, res) => {
  const result = await apiCall("POST", "/telephone-numbers/release", req.body);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// PORTING
// ════════════════════════════════════════
router.get("/porting/check", async (req, res) => {
  const result = await apiCall("GET", "/porting/check", null, {
    areaCode: req.query.areaCode,
    exchangeCode: req.query.exchangeCode
  });
  res.status(result.status).json(result.data);
});

router.post("/porting", async (req, res) => {
  const result = await apiCall("POST", "/porting", req.body);
  res.status(result.status).json(result.data);
});

router.get("/porting", async (req, res) => {
  const result = await apiCall("GET", "/porting");
  res.status(result.status).json(result.data);
});

router.get("/porting/:requestId", async (req, res) => {
  const result = await apiCall("GET", `/porting/${req.params.requestId}`);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// SIM CARDS
// ════════════════════════════════════════
router.get("/sim-cards", async (req, res) => {
  const result = await apiCall("GET", "/sim-cards");
  res.status(result.status).json(result.data);
});

router.post("/sim-cards", async (req, res) => {
  const result = await apiCall("POST", "/sim-cards", req.body);
  res.status(result.status).json(result.data);
});

router.delete("/sim-cards/:simId", async (req, res) => {
  const result = await apiCall("DELETE", `/sim-cards/${req.params.simId}`);
  res.status(result.status).json(result.data);
});

// ════════════════════════════════════════
// WEBHOOKS
// ════════════════════════════════════════
router.post("/webhooks", async (req, res) => {
  const result = await apiCall("POST", "/webhooks", req.body);
  res.status(result.status).json(result.data);
});

router.get("/webhooks", async (req, res) => {
  const result = await apiCall("GET", "/webhooks");
  res.status(result.status).json(result.data);
});

module.exports = router;
