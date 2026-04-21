const express = require("express");
const Outscraper = require("outscraper");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

function hasRealWebsite(url) {
  if (!url || !String(url).trim()) return false;

  const normalized = String(url).toLowerCase();
  const badDomains = [
    "facebook.com",
    "instagram.com",
    "yelp.com",
    "m.yelp.com",
    "linkedin.com",
    "nextdoor.com"
  ];

  return !badDomains.some((d) => normalized.includes(d));
}

function dedupePlaces(places) {
  const seen = new Set();
  const out = [];

  for (const p of places) {
    const key = p.place_id || p.google_id || `${p.name}|${p.full_address}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }

  return out;
}

function toReviewLookupId(placeId) {
  if (!placeId) return placeId;
  return String(placeId).startsWith("r") ? String(placeId) : `r${placeId}`;
}

app.post("/api/businesses", async (req, res) => {
  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const { city, state, niche, limit = 25 } = req.body || {};
    if (!city || !state || !niche) {
      return res.status(400).json({
        success: false,
        error: "city, state, and niche are required"
      });
    }

    const client = new Outscraper(apiKey);

    // Try several simple query styles closer to Outscraper examples.
    const queries = [
      `${niche} ${city} usa`,
      `${niche} ${city} ${state} usa`,
      `${niche} ${city}`,
      `${niche} ${state} usa`
    ];

    const response = await client.googleMapsSearch(
      queries,
      Number(limit),
      "en",
      "US"
    );

    const allPlaces = Array.isArray(response)
      ? response.flatMap((group) => (Array.isArray(group) ? group : []))
      : [];

    const deduped = dedupePlaces(allPlaces);

    const businesses = deduped
      .filter((p) => !hasRealWebsite(p.site))
      .slice(0, Number(limit))
      .map((p) => ({
        name: p.name || "",
        phone: p.phone || "",
        address: p.full_address || "",
        rating: p.rating ?? null,
        reviews: p.reviews ?? 0,
        placeId: p.place_id || "",
        googleId: p.google_id || "",
        website: p.site || ""
      }));

    return res.json({
      success: true,
      queriesTried: queries,
      totalFound: deduped.length,
      withoutWebsite: businesses.length,
      rawSample: deduped.slice(0, 10).map((p) => ({
        name: p.name || "",
        website: p.site || "",
        placeId: p.place_id || "",
        googleId: p.google_id || "",
        address: p.full_address || ""
      })),
      businesses
    });
  } catch (err) {
    console.error("BUSINESSES ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Unknown error"
    });
  }
});

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

    const client = new Outscraper(apiKey);

    // Outscraper examples for specific place/review lookups use an id with an "r" prefix.
    const lookupId = toReviewLookupId(placeId);

    const response = await client.googleMapsReviews(
      [lookupId],
      3,
      1,
      "en",
      "newest"
    );

    const place = Array.isArray(response?.[0])
      ? response[0][0]
      : Array.isArray(response)
      ? response[0]
      : null;

    const reviews = (place?.reviews_data || []).slice(0, 3).map((r) => ({
      author: r.author_title || "",
      rating: r.review_rating ?? null,
      text: r.review_text || ""
    }));

    return res.json({
      success: true,
      requestedPlaceId: placeId,
      lookupId,
      matchedBusiness: place?.name || null,
      reviewCount: Array.isArray(place?.reviews_data) ? place.reviews_data.length : 0,
      reviews
    });
  } catch (err) {
    console.error("REVIEWS ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Unknown error"
    });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Express + Outscraper listening on 3000");
});
