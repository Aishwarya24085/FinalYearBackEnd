import express from "express";
import cors from "cors";
import multer from "multer";
import { getComparisonData } from "./GeminiPro.js";

const app = express();
app.use(cors());
app.use(express.json());

// File upload setup
const upload = multer({ dest: "uploads/" });

//we get the data from client and send the response.
app.post("/search", upload.single("image"), async (req, res) => {
  try {
    const { searchText, platforms } = req.body;
    const file = req.file;

    //form uploads every thing in string so we convert it to array
    const parsedPlatforms = platforms ? JSON.parse(platforms) : [];

    const data = await getComparisonData(
      searchText,
      file,
      parsedPlatforms
    );

    res.json(data);

    console.log("Search text:", searchText);
    console.log("Platforms:", parsedPlatforms);
    console.log("Uploaded file:", file);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch comparison data" });
  }
});


app.listen(5000, () => {
  console.log("Server running on port 5000");
});
