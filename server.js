const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("ok"));
app.get("/health", (req, res) => res.send("ok"));

/**
 * Detect if business has NO real website
 */
function hasNoRealWebsite(site) {
  const s = (site || "").toLowerCase().trim();

  if (!s) return true;

  const badDomains = [
    "facebook.com",
    "instagram.com",
    "yelp.com",
    "m.yelp.com",
    "linkedin.com",
    "nextdoor.com",
    "angi.com",
    "homeadvisor.com",
    "bbb.org"
  ];

  return badDomains.some((d) => s.includes(d));
}

/**
 * BUSINESS SEARCH (ZIP-based, matches Outscraper UI)
 */
app.post("/api/businesses", async (req, res) => {
  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    const { category, zips, limit = 50 } = req.body || {};

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    if (!category || !Array.isArray(zips) || !zips.length) {
      return res.status(400).json({
        success: false,
        error: "category + zips required"
      });
    }

    const queries = zips.map((zip) => `${category}, ${zip}, US`);

    const response = await fetch(
      "https://api.outscraper.cloud/google-maps-search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        },
        body: JSON.stringify({
          query: queries,
          limit,
          async: false,
          language: "en"
        })
      }
    );

    const data = await response.json();

    const places = Array.isArray(data?.data)
      ? data.data.flatMap((group) => (Array.isArray(group) ? group : []))
      : [];

    const businesses = places
      .filter((p) => hasNoRealWebsite(p.site))      // 🔥 KEY FILTER
      .filter((p) => (p.reviews || 0) >= 3)         // 🔥 QUALITY FILTER
      .map((p) => ({
        name: p.name || "",
        phone: p.phone || "",
        address: p.full_address || "",
        website: p.site || "",
        googleId: p.google_id || "",
        placeId: p.place_id || "",
        reviewCount: p.reviews || 0,
        rating: p.rating ?? null
      }));

    return res.json({
      success: true,
      total: businesses.length,
      businesses
    });
  } catch (err) {
    console.error("BUSINESSES ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error"
    });
  }
});

/**
 * REVIEWS (uses googleId — most reliable)
 */
app.post("/api/reviews", async (req, res) => {
  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    const { googleId } = req.body || {};

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    if (!googleId) {
      return res.status(400).json({
        success: false,
        error: "googleId required"
      });
    }

    const response = await fetch(
      "https://api.app.outscraper.com/maps/reviews-v3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        },
        body: JSON.stringify({
          query: googleId,
          limit: 3,
          reviewsLimit: 3,
          sort: "newest",
          language: "en",
          async: false
        })
      }
    );

    const data = await response.json();

    const place =
      data?.data?.[0]?.[0] ||
      data?.data?.[0] ||
      data?.results?.[0]?.[0] ||
      data?.results?.[0] ||
      null;

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
  console.log("Outscraper API running on port 3000");
});
