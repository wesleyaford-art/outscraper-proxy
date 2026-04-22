const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.status(200).send("ok"));
app.get("/health", (req, res) => res.status(200).send("ok"));

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

    const queries = zips.map(
  (zip) => `${category}, ${zip}, NC, US`
);

    const response = await fetch("https://api.app.outscraper.com/maps/search-v3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      },
      body: JSON.stringify({
        query: queries,
        limit: Number(limit),
        async: false,
        language: "en"
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        success: false,
        error: `Outscraper search failed: ${response.status} ${text}`
      });
    }

    const data = await response.json();

    const businesses = places
  .filter((p) => hasNoRealWebsite(p.website || p.site))   // ✅ no website filter
  .filter((p) => (p.reviews || 0) >= 3)                   // ✅ quality filter (PUT IT HERE)
  .map((p) => ({
    name: p.name || "",
    phone: p.phone || "",
    address: p.address || p.full_address || "",
    website: p.website || p.site || "",
    googleId: p.google_id || "",
    placeId: p.place_id || "",
    reviewCount: p.reviews || 0,
    rating: p.rating ?? null
  }));

    const deduped = [];
    const seen = new Set();

    for (const p of places) {
      const key = p.place_id || p.google_id || `${p.name}|${p.address || p.full_address}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(p);
      }
    }

    const businesses = deduped
      .filter((p) => hasNoRealWebsite(p.website || p.site))
      .map((p) => ({
        name: p.name || "",
        phone: p.phone || "",
        address: p.address || p.full_address || "",
        website: p.website || p.site || "",
        googleId: p.google_id || "",
        placeId: p.place_id || "",
        reviewCount: p.reviews || 0,
        rating: p.rating ?? null
      }));

    return res.json({
      success: true,
      queriesTried: queries,
      totalFound: deduped.length,
      withoutWebsite: businesses.length,
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

app.post("/api/reviews", async (req, res) => {
  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    const { googleId, placeId } = req.body || {};

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const lookup = googleId || placeId;

    if (!lookup) {
      return res.status(400).json({
        success: false,
        error: "googleId or placeId required"
      });
    }

    const response = await fetch("https://api.app.outscraper.com/maps/reviews-v3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      },
      body: JSON.stringify({
        query: lookup,
        limit: 3,
        reviewsLimit: 3,
        sort: "newest",
        language: "en",
        async: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        success: false,
        error: `Outscraper reviews failed: ${response.status} ${text}`
      });
    }

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
      reviewCount: Array.isArray(place?.reviews_data) ? place.reviews_data.length : 0,
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
