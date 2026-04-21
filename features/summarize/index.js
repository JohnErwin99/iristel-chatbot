const express = require("express");
const router = express.Router();

// Strips HTML to plain text, keeping structure
function htmlToText(html) {
  return html
    // Remove scripts and styles entirely
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    // Convert headings to markdown-style
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    // Convert list items
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    // Paragraphs and line breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Clean up whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extract page title from HTML
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

// Extract meta description
function extractMeta(html) {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  return match ? match[1].trim() : null;
}

/**
 * POST /api/features/summarize
 * Body: { url: "https://iristel.com/some-page" }
 * Returns: { title, summary, url }
 */
router.post("/", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  // Security: only allow summarizing pages on the hosted domain
  const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || "iristel.com,www.iristel.com,localhost").split(",");
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOSTS.some(h => parsedUrl.hostname === h.trim() || parsedUrl.hostname.endsWith("." + h.trim()))) {
    return res.status(403).json({ error: "Summarization is only available for pages on " + ALLOWED_HOSTS.join(", ") });
  }

  try {
    // Fetch the page
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "IrisBot/1.0 (Iristel Page Summarizer)" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    });

    if (!pageRes.ok) {
      return res.status(502).json({ error: "Could not fetch page: HTTP " + pageRes.status });
    }

    const html = await pageRes.text();
    const title = extractTitle(html) || "Untitled Page";
    const meta = extractMeta(html);
    const pageText = htmlToText(html);

    // Truncate to avoid overwhelming the LLM
    const truncated = pageText.slice(0, 6000);

    // Ask Groq to summarize
    const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
    const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes web pages. Provide a clear, concise summary in 3-5 bullet points. Focus on key information, services, or value propositions. Keep it brief and useful."
          },
          {
            role: "user",
            content: `Summarize this web page.\n\nTitle: ${title}\n${meta ? "Meta description: " + meta + "\n" : ""}\nPage content:\n${truncated}`
          }
        ]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq error in summarize:", err);
      return res.status(502).json({ error: "LLM summarization failed" });
    }

    const groqData = await groqRes.json();
    const summary = groqData.choices?.[0]?.message?.content || "Could not generate summary.";

    res.json({ title, summary, url });
  } catch (err) {
    console.error("Summarize error:", err);
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "Page fetch timed out" });
    }
    res.status(500).json({ error: "Summarization failed" });
  }
});

/**
 * POST /api/features/summarize/text
 * Body: { text: "...", context: "page title or URL" }
 * Summarize raw text (for when the page is already loaded client-side)
 */
router.post("/text", async (req, res) => {
  const { text, context } = req.body;

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  const truncated = text.slice(0, 6000);
  const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
  const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes web page content. Provide a clear, concise summary in 3-5 bullet points. Focus on key information, services, or value propositions."
          },
          {
            role: "user",
            content: `Summarize this content${context ? " from: " + context : ""}.\n\n${truncated}`
          }
        ]
      })
    });

    if (!groqRes.ok) {
      return res.status(502).json({ error: "LLM summarization failed" });
    }

    const groqData = await groqRes.json();
    const summary = groqData.choices?.[0]?.message?.content || "Could not generate summary.";
    res.json({ summary, context: context || null });
  } catch (err) {
    console.error("Text summarize error:", err);
    res.status(500).json({ error: "Summarization failed" });
  }
});

module.exports = router;
