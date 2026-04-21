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

app.post("/api/businesses", async (req, res) => {
  console.log("BUSINESSES: route hit");

  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    console.log("BUSINESSES: has key =", !!apiKey);

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const { city, state, niche, limit = 25 } = req.body || {};
    console.log("BUSINESSES: body =", { city, state, niche, limit });

    if (!city || !state || !niche) {
      return res.status(400).json({
        success: false,
        error: "city, state, and niche are required"
      });
    }

    console.log("BUSINESSES: creating client");
    const client = new Outscraper(apiKey);

   const query = `${niche} in ${city}, ${state}`;
    console.log("BUSINESSES: query =", query);

    const timeoutMs = 15000;

    const response = await Promise.race([
      client.googleMapsSearch([query], Number(limit), "en", "US"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Outscraper timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);

    console.log("BUSINESSES: raw response received");

   const places = Array.isArray(response?.[0]) ? response[0] : [];

const businesses = places
  .filter((p) => !p.site || String(p.site).trim() === "")
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
  totalFound: places.length,
  withoutWebsite: businesses.length,
  sample: places.slice(0, 5).map((p) => ({
    name: p.name || "",
    website: p.site || ""
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
  console.log("REVIEWS: route hit");

  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    console.log("REVIEWS: has key =", !!apiKey);

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const { placeId } = req.body || {};
    console.log("REVIEWS: placeId =", placeId);

    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: "placeId is required"
      });
    }

    const client = new Outscraper(apiKey);

    const timeoutMs = 15000;

    const response = await Promise.race([
      client.googleMapsReviews([placeId], 3, 1, "en", "newest"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Outscraper timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);

    console.log("REVIEWS: raw response received");

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

    return res.json({ success: true, reviews });
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
