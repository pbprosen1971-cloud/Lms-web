import crypto from "crypto";

interface HandlerResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export const handler = async (event: any): Promise<HandlerResponse> => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight CORS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: "Method Not Allowed" })
    };
  }

  try {
    // 1. Authenticate Request
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: "অননুমোদিত অনুরোধ। অনুগ্রহ করে প্রথমে লগইন করুন।"
        })
      };
    }

    const idToken = authHeader.split(" ")[1];
    if (!idToken || idToken.length < 10) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: "অবৈধ অথেনটিকেশন টোকেন।"
        })
      };
    }

    // Decode JWT payload to safely extract user UID
    let tokenUid = "";
    try {
      const parts = idToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        tokenUid = payload.user_id || payload.sub || "";
      }
    } catch (e) {
      console.warn("JWT parse warning in Netlify cloudinary-sign function:", e);
    }

    let parsedBody: any = {};
    try {
      parsedBody = event.body ? JSON.parse(event.body) : {};
    } catch {}

    const effectiveUid = tokenUid || parsedBody.uid || "user";
    const sanitizedUid = String(effectiveUid).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);

    // 2. Read Cloudinary Credentials from Netlify Environment Variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Cloudinary পরিবেশ ভেরিয়েবল (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) Netlify-তে কনফিগার করা হয়নি।"
        })
      };
    }

    // 3. Generate Signed Parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "medha_profiles";
    const publicId = `profile_${sanitizedUid}_${timestamp}`;

    const paramsToSign: Record<string, string | number> = {
      folder,
      public_id: publicId,
      timestamp
    };

    const sortedKeys = Object.keys(paramsToSign).sort();
    const stringToSign = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join("&");

    const signature = crypto
      .createHash("sha1")
      .update(stringToSign + apiSecret)
      .digest("hex");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp,
        signature,
        apiKey,
        cloudName,
        folder,
        publicId
      })
    };
  } catch (err: any) {
    console.error("Netlify function error in cloudinary-sign:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: err?.message || "সিগনেচার তৈরির সময় অভ্যন্তরীণ সার্ভার সমস্যা হয়েছে।"
      })
    };
  }
};
