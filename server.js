const express = require("express");
const cors = require("cors");

const app = express();

// ✅ REQUIRED: enable CORS so browser can talk to Railway
app.use(cors());

// ✅ REQUIRED: parse JSON body
app.use(express.json());

// Health checks
app.get("/", (req, res) => res.send("OK"));
app.get("/health", (req, res) => res.send("OK"));

// ===============================
// BUSINESS SEARCH ENDPOINT
// ===============================
app.post("/api/businesses", async (req, res) => {
  try {
    const { category, zips, limit } = req.body;

    if (!category || !Array.isArray(zips) || zips.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing category or zips"
      });
    }

    const apiKey = process.env.OUTSCRAPER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Missing OUTSCRAPER_API_KEY"
      });
    }

    const queries = zips.map(
      (zip) => `${category}, ${zip}, US`
    );

    const outscraperResponse = await fetch(
      "https://api.outscraper.com/maps/search-v3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        },
        body: JSON.stringify({
          query: queries,
          limit: limit || 20,
          async: false
        })
      }
    );

    const data = await outscraperResponse.json();

    // Normalize response
    const businesses = (data?.data || [])
      .flat()
      .map((item) => ({
        businessName: item.name || "",
        phone: item.phone || "",
        address: item.full_address || "",
        rating: item.rating ?? null,
        reviewCount: item.reviews || 0,
        placeId: item.place_id || "",
        googleId: item.google_id || "",
        website: item.site || ""
      }));

    return res.json({
      success: true,
      businesses
    });
  } catch (error) {
    console.error("BUSINESSES ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Server error fetching businesses"
    });
  }
});

// ===============================
// REVIEWS ENDPOINT
// ===============================
app.post("/api/reviews", async (req, res) => {
  try {
    const { googleId } = req.body;

    if (!googleId) {
      return res.status(400).json({
        success: false,
        error: "Missing googleId"
      });
    }

    const apiKey = process.env.OUTSCRAPER_API_KEY;

    const response = await fetch(
      "https://api.outscraper.com/maps/reviews-v3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        },
        body: JSON.stringify({
          query: googleId,
          limit: 5,
          async: false
        })
      }
    );

    const data = await response.json();

    const reviews = (data?.data?.[0]?.reviews || []).map((r) => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      date: r.relative_time_description
    }));

    return res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error("REVIEWS ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Server error fetching reviews"
    });
  }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
