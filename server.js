const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("ok"));
app.get("/health", (req, res) => res.send("ok"));

app.post("/api/reviews", async (req, res) => {
  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const { placeId } = req.body || {};
    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: "placeId is required"
      });
    }

    // 🔥 Direct API call (no SDK)
    const response = await fetch(
      "https://api.outscraper.cloud/google-maps-reviews",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        },
        body: JSON.stringify({
          query: placeId,   // placeId works here
          limit: 3,
          sort: "newest",
          language: "en",
          async: false
        })
      }
    );

    const data = await response.json();

    // Outscraper returns nested arrays
    const place = data?.data?.[0]?.[0] || null;

    const reviews = (place?.reviews_data || []).slice(0, 3).map((r) => ({
      author: r.author_title || "",
      rating: r.review_rating ?? null,
      text: r.review_text || ""
    }));

    return res.json({
      success: true,
      matchedBusiness: place?.name || null,
      reviewCount: place?.reviews_data?.length || 0,
      reviews
    });
  } catch (err) {
    console.error("REVIEWS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error"
    });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Outscraper Direct API running on 3000");
});
