import express from "express";
import axios from "axios";
import { parseString } from "xml2js";
import he from "he";

const app = express();

// Default local port is 3000. Modify this number if you wanna change it.
const port = 3000;

// Replace this with your own Goodreads Updates URL. See README for information.
const feedUrl =
  "https://www.goodreads.com/user/updates_rss/147409847";

// Function to fetch and parse the RSS feed
async function fetchRSS() {
  try {
    const response = await axios.get(feedUrl);
    const rssData = response.data;
    const parsedData = await new Promise((resolve, reject) => {
      parseString(rssData, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
    return parsedData.rss.channel.item || [];
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    return [];
  }
}

// Function to extract the relevant progress items and book covers
async function processProgressItems() {
  const items = await fetchRSS();

  const seenTitles = new Set();
  const books = [];

  for (const item of items) {
    try {
      const cleanTitle = item.title.replace(/\s+/g, " ").trim();

      if (!(cleanTitle.includes("is") && cleanTitle.includes("done with"))) {
        continue;
      }

      const titleMatch = cleanTitle.match(/is (\d+)% done with (.+)/);
      if (!titleMatch) continue;

      const progress = parseInt(titleMatch[1], 10);
      const title = titleMatch[2].trim();

      // Skip if we've already added this book
      if (seenTitles.has(title)) continue;

      const rawDesc = item.description || item["content:encoded"] || "";
      const desc = he.decode(rawDesc);

      const coverMatch = desc.match(/src="([^"]+)"/);
      if (!coverMatch) continue;

      const rawCover = coverMatch[1];
      const coverImage = rawCover.replace(/\._S[XY]\d+_/, "._SX180_");

      books.push({
        title,
        progress,
        coverImage,
      });

      // Mark this book as seen
      seenTitles.add(title);

    } catch (err) {
      console.warn(`Skipping item due to error: ${err}`);
    }
  }

  return books;
}


// Route to get books data
app.get("/currently-reading", async (req, res) => {
  try {
    const books = await processProgressItems();
    console.log("Fetched", books.length, "items from RSS feed.");
    res.json(books);
  } catch (error) {
    console.error("Error fetching book progress:", error);
    res.status(500).json({ error: "Failed to fetch book progress" });
  }
});

// Route to return sample data for testing
// Three items
app.get("/testThreeItems", async (req, res) => {
  const sampleBooks = [
    {
      title: "Sunrise on the Reaping",
      progress: 61,
      coverImage:
        "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1729090282l/214333691._SX180_.jpg",
    },
    {
      title: "King Leopold's Ghost",
      progress: 55,
      coverImage:
        "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328315558i/10474352._SX180_.jpg",
    },
    {
      title: "Swimming in the Dark",
      progress: 38,
      coverImage:
        "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1610434755l/54496088._SX180_.jpg",
    },
  ];

  res.json(sampleBooks);
});

// Two items
app.get("/testTwoItems", async (req, res) => {
  const sampleBooks = [
    {
      title: "King Leopold's Ghost",
      progress: 55,
      coverImage:
        "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1328315558i/10474352._SX180_.jpg",
    },
    {
      title: "Swimming in the Dark",
      progress: 38,
      coverImage:
        "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1610434755l/54496088._SX180_.jpg",
    },
  ];

  res.json(sampleBooks);
});

app.listen(port, () => {
  console.log(`📚 Server running at http://localhost:${port}`);
});
