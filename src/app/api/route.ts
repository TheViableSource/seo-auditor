import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request: Request) {
  // 1. Log that the API was actually hit
  console.log("--- API ROUTE HIT ---");

  try {
    const body = await request.json();
    let { url } = body;
    
    console.log("Received URL:", url);

    // 2. Validate and Fix URL
    if (!url) {
      throw new Error("URL is empty");
    }
    
    // Automatically add https:// if missing
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    console.log("Fetching URL:", url);

    // 3. Try to fetch the website
    const response = await fetch(url, {
      headers: {
        // Fake a real browser to avoid being blocked by some sites
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    console.log("Fetch Status:", response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch site. Status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log("HTML Content Length:", html.length);

    // 4. Load into Cheerio
    const $ = cheerio.load(html);

    const title = $("title").text() || "No title tag found";
    const h1 = $("h1").first().text() || "No H1 header found";
    const description = $('meta[name="description"]').attr("content") || "No meta description found";

    console.log("Success! Found title:", title);

    // 5. Return Success
    return NextResponse.json({
      score: 85, // Hardcoded score for now, but real data below
      details: {
        title,
        h1,
        description
      }
    });

  } catch (error: any) {
    // 6. LOG THE ACTUAL ERROR TO THE TERMINAL
    console.error("!!! SERVER ERROR !!!", error.message);
    
    return NextResponse.json(
      { error: error.message || "Failed to scrape site." }, 
      { status: 500 }
    );
  }
}

// Add this to allow testing in the browser
export async function GET() {
  return Response.json({ message: "API is working!" });
}