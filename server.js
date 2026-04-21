import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Outscraper from "outscraper";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new Outscraper(process.env.OUTSCRAPER_API_KEY);

// Get businesses with no website
app.post("/api/businesses", async (req, res) => {
  try {
    const { city, state, niche, limit = 25 } = req.body;

    const query = `${niche} ${city} ${state} USA`;

    const response = await client.googleMapsSearch(
      [query],
      Number(limit),
      "en",
      "US"
    );

    const places = response?.[0] || [];

    const businesses = places
      .filter(p => !p.site || p.site.trim() === "")
      .map(p => ({
        name: p.name,
        phone: p.phone,
        address: p.full_address,
        rating: p.rating,
        reviews: p.reviews,
        placeId: p.place_id,
        googleId: p.google_id
      }));

    res.json({ success: true, businesses });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get 3 newest reviews
app.post("/api/reviews", async (req, res) => {
  try {
    const { placeId } = req.body;

    const response = await client.googleMapsReviews(
      [placeId],
      3,
      1,
      "en",
      "newest"
    );

    const place = response?.[0]?.[0] || response?.[0];

    const reviews = (place?.reviews_data || []).slice(0, 3).map(r => ({
      author: r.author_title,
      rating: r.review_rating,
      text: r.review_text
    }));

    res.json({ success: true, reviews });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
