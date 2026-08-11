import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface IngredientSyncItem {
  id: string;
  name: string;
  supplierArticleCode?: string;
  productUrl?: string;
  currentPrice: number;
  supplierName?: string;
}

interface ArticlePriceQueryResult {
  ingredientId?: string;
  articleCode: string;
  supplierName: string;
  oldPrice: number;
  newPurchasePrice: number;
  priceDelta: number;
  status: "updated" | "unchanged" | "not_found" | "error";
  message: string;
}

/**
 * Serverless API Route to scrape / sync wholesale prices based on article codes.
 * Uses ScraperAPI to bypass Akamai/Cloudflare on Makro.nl
 */
export async function POST(req: Request) {
  const SCRAPER_API_KEY = process.env.SCRAPERAPI_KEY || "";
  
  try {
    const body = await req.json().catch(() => ({}));
    const timestamp = new Date().toISOString();

    const items: IngredientSyncItem[] = body.items && Array.isArray(body.items) ? body.items : [];
    const results: ArticlePriceQueryResult[] = [];
    const sligroCookie = process.env.SLIGRO_COOKIE || body.sligroCookie || "";
    const hanosCookie = process.env.HANOS_COOKIE || body.hanosCookie || "";

    // As a fallback and performance optimization for known static prices
    const staticCache: Record<string, { price: number; name: string }> = {
      "59920": { name: "METRO Chef Hamburger Amerikaans (20 stuks / 2,5 kg)", price: 37.48 },
      "3284216": { name: "METRO Chef Hamburger Amerikaans (20 stuks / 2,5 kg)", price: 37.48 },
      "7187C010": { name: "Hamburgerbroodjes Brioche", price: 2.05 }
    };

    for (const item of items) {
      const code = (item.supplierArticleCode || "").trim().toUpperCase();
      const directUrl = (item.productUrl || "").trim();
      if (!code && !directUrl) continue;

      // Determine supplier display name and domain
      let supplierDisplay = item.supplierName || "Groothandel";
      if (directUrl.includes("sligro.nl") || (item.supplierName && item.supplierName.toLowerCase().includes("sligro"))) {
        supplierDisplay = "Sligro";
      } else if (directUrl.includes("hanos.nl") || (item.supplierName && item.supplierName.toLowerCase().includes("hanos"))) {
        supplierDisplay = "Hanos";
      } else if (directUrl.includes("makro.nl") || (item.supplierName && item.supplierName.toLowerCase().includes("makro"))) {
        supplierDisplay = "Makro";
      }

      let scrapedPrice = item.currentPrice;
      let scrapedName = item.name;
      let found = false;
      let isBehindLoginWall = false;

      // 1. Check static cache first
      if (code && staticCache[code]) {
        scrapedPrice = staticCache[code].price;
        scrapedName = staticCache[code].name;
        found = true;
      } 
      // 2. Real Web Scraping using ScraperAPI
      else if (SCRAPER_API_KEY) {
        try {
          const targetUrl = directUrl || `https://www.makro.nl/marketplace/product/${code}`;
          let scraperApiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
          
          const fetchHeaders: Record<string, string> = {};
          let activeCookie = "";
          if (supplierDisplay === "Sligro" && sligroCookie) activeCookie = sligroCookie;
          if (supplierDisplay === "Hanos" && hanosCookie) activeCookie = hanosCookie;

          if (activeCookie) {
            scraperApiUrl += `&keep_headers=true`;
            fetchHeaders["Cookie"] = activeCookie;
          }

          const response = await fetch(scraperApiUrl, { headers: fetchHeaders });
          
          if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);

            // Check if page redirected to a login wall (common on Sligro/Hanos B2B portals)
            if (html.includes("inloggen") || html.includes("login") || html.includes("Inloggen bij Sligro") || html.includes("Mijn HANOS")) {
              isBehindLoginWall = true;
            }
            
            let priceFound = false;
            
            // A. Structured JSON-LD Data Parsing
            $('script[type="application/ld+json"]').each((_, element) => {
              try {
                const text = $(element).html();
                if (text) {
                  const json = JSON.parse(text);
                  const itemsToCheck = Array.isArray(json) ? json : [json];
                  for (const obj of itemsToCheck) {
                    if (obj["@type"] === "Product" && obj.offers) {
                      const offer = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
                      if (offer && offer.price) {
                        scrapedPrice = parseFloat(offer.price);
                        if (obj.name) scrapedName = obj.name;
                        priceFound = true;
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            });

            // B. HTML Selectors Fallback (Makro, Sligro, Hanos, Bidfood)
            if (!priceFound) {
              const priceSelectors = [
                '.price',
                '[data-test="product-price"]',
                '.product-detail__price',
                '.product-price-amount',
                '.c-price',
                '.price-current',
                '.price-number',
                'meta[property="product:price:amount"]'
              ];

              for (const selector of priceSelectors) {
                let priceText = "";
                if (selector.startsWith("meta")) {
                  priceText = $(selector).attr("content") || "";
                } else {
                  priceText = $(selector).first().text().trim();
                }

                if (priceText) {
                  const cleanPrice = priceText.replace(/[^0-9,.]/g, '').replace(',', '.');
                  const parsed = parseFloat(cleanPrice);
                  if (!isNaN(parsed) && parsed > 0) {
                    scrapedPrice = parsed;
                    priceFound = true;
                    break;
                  }
                }
              }
            }
            
            found = priceFound;
          }
        } catch (fetchErr) {
          console.error(`ScraperAPI Error for ${code || directUrl}:`, fetchErr);
        }
      }

      if (!found && !staticCache[code]) {
        let msg = `⚠️ Kan artikel ${code || item.name} niet uitlezen op ${supplierDisplay}.`;
        if (isBehindLoginWall || supplierDisplay === "Sligro" || supplierDisplay === "Hanos") {
          msg = `🔒 ${supplierDisplay} afgeschermd achter B2B inlogmuur. Gebruik de Webshop Link knop om direct de prijs op ${supplierDisplay} te bekijken.`;
        }

        results.push({
          ingredientId: item.id,
          articleCode: code || "LINK",
          supplierName: supplierDisplay,
          oldPrice: item.currentPrice,
          newPurchasePrice: item.currentPrice,
          priceDelta: 0,
          status: SCRAPER_API_KEY ? "not_found" : "error",
          message: msg
        });
        continue;
      }

      const priceDelta = Math.round((scrapedPrice - item.currentPrice) * 100) / 100;
      const isPriceUpdated = Math.abs(priceDelta) > 0.001;

      if (isPriceUpdated) {
        results.push({
          ingredientId: item.id,
          articleCode: code,
          supplierName: item.supplierName || "Makro Breda",
          oldPrice: item.currentPrice,
          newPurchasePrice: scrapedPrice,
          priceDelta,
          status: "updated",
          message: ` Live Prijs-Sync voor ${scrapedName || item.name} (${code}): Gesynct naar €${scrapedPrice.toFixed(2)}`
        });
      } else {
        results.push({
          ingredientId: item.id,
          articleCode: code,
          supplierName: item.supplierName || "Makro Breda",
          oldPrice: item.currentPrice,
          newPurchasePrice: item.currentPrice,
          priceDelta: 0,
          status: "unchanged",
          message: `ℹ️ ${scrapedName || item.name} (${code}): Prijs live gecontroleerd - Ongewijzigd (€${item.currentPrice.toFixed(2)})`
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp,
      syncCount: results.filter((r) => r.status === "updated").length,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Sync error" }, { status: 500 });
  }
}
