import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using the model we verified earlier
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType,
        },
    };
}

/**
 * @param {string} productName - may be empty or null if image provided
 * @param {object|null} imageFile - e.g., multer file object; null if none
 * @param {string[]} selectedVendors - array of vendor names, e.g. ["Flipkart","Amazon"]
 */
export async function getComparisonData(productName, imageFile, selectedVendors = []) {
    try {
        // Build a comma-separated vendor list; fallback to a default set
        const vendorsText = Array.isArray(selectedVendors)
        ? selectedVendors.join(", ")
        : "Flipkart, Amazon, Myntra";

        // Updated prompt with the new structure and instructions
        let prompt = `You are a smart shopping assistant for an e-commerce price comparison system.

Product to search:
"${productName}"

Allowed vendors (use ONLY these vendors):
${vendorsText}

Task:
Generate a realistic and conservative price comparison for the given product across the allowed vendors.

Rules:
- Use only the vendors provided in the allowed vendors list.
- If a vendor does not sell this product, exclude that vendor.
- Do NOT invent vendors or product variants.
- Prices must be realistic and consistent with the Indian e-commerce market.
- If the exact product listing URL is unknown, use a valid vendor search URL for the product.
- If pricing is uncertain, provide a conservative market estimate.
- Do NOT fabricate coupons; include them only if commonly known, otherwise use null.
- If the product cannot be confidently identified, return an empty deals array.

Image Handling (if image provided):
    ${imageFile}
- Infer the closest identifiable product name.
- If the image is unclear, return empty deals.

Return Format:
Return ONLY raw JSON. Do NOT include explanations, markdown, or comments.

JSON Structure:
{
  "bestDeal": {
    "productName": "Exact or Closest Identifiable Product Name",
    "bestPrice": "₹XX,XXX",
    "bestVendor": "Vendor Name",
    "bestVendorLink": "Valid product or search URL"
  },
  "deals": [
    {
      "vendor": "Vendor Name",
      "price": "₹XX,XXX",
      "rating": "4.X",
      "coupon": null,
      "couponTag": null,
      "logoUrl": "Known vendor logo URL or placeholder",
      "vendorUrl": "Valid product or search URL",
      "buttonStyle": {}
    }
  ]
}

Location specific search:
India,Andhra Pradesh,Visakhapatnam

Example urls of vendorUrls:
- for Flipkart: https://www.flipkart.com/dot-key-sunscreen-spf-50-pa-vitamin-c-e-super-bright-waterlight-even-toned-glowing-skin/p/itm4a507f1a83904?pid=SNRGJZUDJZKGH9HF&lid=LSTSNRGJZUDJZKGH9HF0UBOAH&marketplace=FLIPKART&q=Dot+%26+Key+Vitamin+C+%2B+E+Super+Bright+Sunscreen+SPF+50%2B&store=g9b%2Fema%2F5la%2Fxrh&spotlightTagId=default_BestsellerId_g9b%2Fema%2F5la%2Fxrh&srno=s_1_1&otracker=search&otracker1=search&fm=Search&iid=512ab41c-e9c5-421e-961e-9444a67228a2.SNRGJZUDJZKGH9HF.SEARCH&ppt=sp&ppn=sp&ssid=ms8tgyo99c0000001767503979733&qH=9f546c3f2ca672cb
- for Amazon: https://www.amazon.in/Vitamin-Sunscreen-Water-Light-Protection-Absorption/dp/B0BLK4YRSN/ref=sr_1_5?crid=2RNDT1D985BP1&dib=eyJ2IjoiMSJ9.d3VEkjTRnz4M3BY8sAt1p35PwXoKt8PjuoqoxPBXMrbkJS5m1ZA_JfNLZHINYkkV2gyvzPh1n_1Q5Tsjs3U2AFCuFLiLxGpTrEa-XzsZ1w5aQeUUTx9pA-lZyGBuNA5VYm8AeXSn9wOtkFdP_h93CMgEtsrhaXosNtFBZxbdsLZwY5wH-sI0RsAGc-gzwmp_YANcRGREnAwWC6nmo3kLra8obLA1d4AFqMoWk014So3j-IxmwFePzmkChgN1HoSH0inT7DWpsXYIXjPArxL4h_kmnJhZNB-t54ZonDRq2VQ.yruf0OD6pSzy9e-h2UFrfYsgErAA-HGlXzpAxUZjiRA&dib_tag=se&keywords=dot%2Band%2Bkey%2Bvitamin%2Bc%2Bsunscreen&qid=1767705496&sprefix=dot%2Band%2Bkey%2Bvitamin%2Bc%2Bs%2Caps%2C426&sr=8-5&th=1
- for Myntra: https://www.myntra.com/shrug/sassafras/sassafras-open-front-longline-shrug/31471738/buy
- for croma: https://www.croma.com/black-decker-bxra0901in-2500w-oil-filled-radiator-room-heater-with-9-fins-adjustable-thermostat/p/255749

Constraints:
- Output must be valid JSON.
- Use null instead of fake or unknown data.
- Do not include vendors outside the allowed list.
`;

        let result;
        if (imageFile) {
            const imagePart = fileToGenerativePart(imageFile.path, imageFile.mimetype);
            result = await model.generateContent([prompt, imagePart]);
        } else {
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        let text = response.text();

        // Clean up potential markdown formatting if Gemini adds it despite instructions
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Service Error:", error);
        throw error;
    }
}
