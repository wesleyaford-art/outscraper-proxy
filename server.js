const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.status(200).send("ok"));
app.get("/health", (req, res) => res.status(200).send("ok"));

async function fetchReviews({ apiKey, lookup }) {
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

  const data = await response.json();
  return data;
}

function extractPlace(data) {
  if (!data) return null;

  // Handle a few common Outscraper response shapes.
  if (Array.isArray(data?.data?.[0])) return data.data[0][0] || null;
  if (Array.isArray(data?.data)) return data.data[0] || null;
  if (Array.isArray(data?.results?.[0])) return data.results[0][0] || null;
  if (Array.isArray(data?.results)) return data.results[0] || null;

  return null;
}

function normalizeReviews(place) {
  return (place?.reviews_data || []).slice(0, 3).map((r) => ({
    author: r.author_title || "",
    rating: r.review_rating ?? null,
    text: r.review_text || ""
  }));
}

app.post("/api/reviews", async (req, res) => {
  try {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const { placeId, googleId, query } = req.body || {};

    const lookups = [
      googleId,
      placeId,
      query
    ].filter(Boolean);

    if (!lookups.length) {
      return res.status(400).json({
        success: false,
        error: "Provide one of: googleId, placeId, or query"
      });
    }

    let matchedBusiness = null;
    let reviewCount = 0;
    let reviews = [];
    let lookupUsed = null;
    let rawErrors = [];

    for (const lookup of lookups) {
      try {
        const data = await fetchReviews({ apiKey, lookup });
        const place = extractPlace(data);
        const candidateReviews = normalizeReviews(place);

        if (place || candidateReviews.length) {
          matchedBusiness = place?.name || null;
          reviewCount = Array.isArray(place?.reviews_data) ? place.reviews_data.length : candidateReviews.length;
          reviews = candidateReviews;
          lookupUsed = lookup;
          break;
        } else {
          rawErrors.push({ lookup, note: "No place matched" });
        }
      } catch (err) {
        rawErrors.push({ lookup, error: err.message || "Unknown lookup error" });
      }
    }

    return res.json({
      success: true,
      lookupUsed,
      matchedBusiness,
      reviewCount,
      reviews,
      debug: rawErrors
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
  console.log("Reviews API listening on 3000");
});
