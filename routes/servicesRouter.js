const express = require("express");
const axios = require("axios");
const getUpsToken = require("../utils/getUpsToken");
const findState = require("../utils/findState");
const { getUpsBaseUrl } = require("../utils/upsBaseUrl");
const { calculatePalletPacking } = require("../utils/palletPacking");
const { Variant } = require("../db/models");

const router = express.Router();

const serviceCodes = {
  "03": "UPS Ground",
  "02": "UPS 2nd Day Air",
  "01": "UPS Next Day Air"
};

const defaultShipper = {
  Name: "ESK Packaging LLC",
  ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
  Address: {
    AddressLine: ["11514 Pagemill Rd"],
    City: "Dallas",
    StateProvinceCode: "TX",
    PostalCode: "75082",
    CountryCode: "US",
  },
};

// Resolves cart items (variantId + quantity) into real pack_* dimensions
// from the DB and runs the pallet-packing calculation server-side - the
// client never computes or sends package dimensions itself, so a stale/
// tampered cart can't understate what actually ships.
async function resolvePalletsFromItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("items is required and must be a non-empty array");
    err.status = 400;
    throw err;
  }

  const variantIds = items.map((i) => i.variantId);
  const variants = await Variant.findAll({ where: { id: variantIds } });
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const packItems = items.map((i) => {
    const variant = variantById.get(i.variantId);
    if (!variant) {
      const err = new Error(`Variant ${i.variantId} not found`);
      err.status = 400;
      throw err;
    }
    return {
      sku: variant.title || String(variant.id),
      length: variant.pack_length,
      width: variant.pack_width,
      height: variant.pack_height,
      weight: variant.pack_weight,
      quantity: i.quantity,
    };
  });

  return calculatePalletPacking(packItems);
}

// Builds one UPS Package entry per pallet - previously only ever sent the
// first pallet, making every pallet after the first invisible to the rate
// quote.
function palletsToUpsPackages(pallets) {
  return pallets.map((p) => ({
    PackagingType: {
      Code: "02",
      Description: "Package - Large or Pallet",
    },
    Dimensions: {
      UnitOfMeasurement: { Code: "IN" },
      Length: String(p.length),
      Width: String(p.width),
      Height: String(p.height),
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: "LBS" },
      Weight: String(Math.ceil(p.weight)),
    },
  }));
}

// Same fix on the Taibeta side - one Commodities entry per pallet.
function palletsToTaibetaCommodities(pallets) {
  return pallets.map((p) => ({
    HandlingQuantity: 1,
    PackagingType: 120,
    Length: p.length,
    Width: p.width,
    Height: p.height,
    WeightTotal: Math.ceil(p.weight),
    HazardousMaterial: false,
    PiecesTotal: 1,
    FreightClass: 1,
    NMFC: "string",
    Description: "string",
    AdditionalMarkings: "string",
    UNNumber: "string",
    PackingGroup: 1,
  }));
}

// POST /services/shipping-options
router.post("/shipping-options", async (req, res) => {
  const { recipient, items } = req.body;
  let state;
  try {
    state = await findState(recipient.PostalCode);
  } catch (err) {
    return res.status(400).json({ error: "Invalid or unsupported ZIP code" });
  }

  const resolvedAddress = {
    AddressLine: recipient.AddressLine || ["Unknown"],
    City: recipient.City || "Unknown",
    StateProvinceCode: recipient.StateProvinceCode,
    PostalCode: recipient.PostalCode,
    CountryCode: "US",
  };

  let pallets;
  try {
    ({ pallets } = await resolvePalletsFromItems(items));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
  const upsPackages = palletsToUpsPackages(pallets);

  try {
    const token = await getUpsToken();
    const results = await Promise.allSettled(
      Object.entries(serviceCodes).map(async ([code, name]) => {
        const response = await axios.post(
          `${getUpsBaseUrl()}/api/rating/v1/Rate`,
          {
            RateRequest: {
              Request: { RequestOption: "Rate" },
              Shipment: {
                Shipper: defaultShipper,
                ShipTo: {
                  Name: "Customer",
                  Address: resolvedAddress,
                },
                Package: upsPackages,
                Service: { Code: code },
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              transId: "shipping-options-batch",
              transactionSrc: "esk_web_app",
              "Content-Type": "application/json",
            },
          }
        );
        const data = response.data.RateResponse?.RatedShipment;
        return {
          service: name,
          code,
          price: data?.TotalCharges?.MonetaryValue,
          currency: data?.TotalCharges?.CurrencyCode,
        };
      })
    );

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const code = Object.keys(serviceCodes)[i];
        const name = serviceCodes[code];
        const full = r.reason?.response?.data;

        console.error(
          `❌ ${name} (${code}) error:\n`,
          JSON.stringify(full, null, 2)
        );
      }
    });
    const filtered = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    res.json(filtered);
  } catch (error) {
    console.error("UPS shipping error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to calculate shipping options" });
  }
});



router.post("/sending-options", async (req, res) => {
  const { recipient, items } = req.body;

  let pallets;
  try {
    ({ pallets } = await resolvePalletsFromItems(items));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  try {
    const response = await axios.put(
      "https://www.taibeta.net/PublicAPI/Shipping/getRateQuote",
      {
        authenticationKey: process.env.TAIBETA_API_KEY,
        originZipCode: "11501",
        destinationZipCode: recipient?.PostalCode,
        Commodities: palletsToTaibetaCommodities(pallets),
        WeightUnits: 1,
        DimensionUnits: 1,
        LegacySupport: false,
        CustomerReferenceNumber: "string",
      },
      // { timeout: 35000 }
    );
    if (!Array.isArray(response.data)) {
      return res.status(500).json({ error: response.data });
    }
    const sortedResponse = response.data.sort((a, b) => a.priceTotal - b.priceTotal);
    res.json(sortedResponse.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error?.response?.data || error.message });
  }

});


router.post("/combined-shipping-options", async (req, res) => {
  const { recipient, items } = req.body;

  let pallets, totalWeight, totalDeci;
  try {
    ({ pallets, totalWeight, totalDeci } = await resolvePalletsFromItems(items));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
  const upsPackages = palletsToUpsPackages(pallets);
  const taibetaCommodities = palletsToTaibetaCommodities(pallets);

  try {
    // UPS ve Taibeta API isteklerini Promise.all ile çalıştırıyoruz
    const [upsResult, taibetaResult] = await Promise.all([
      // UPS Request (resilient)
      (async () => {
        try {
          const token = await getUpsToken();
          const results = await Promise.allSettled(
            Object.entries(serviceCodes).map(async ([code, name]) => {
              const response = await axios.post(
                `${getUpsBaseUrl()}/api/rating/v1/Rate`,
                {
                  RateRequest: {
                    Request: { RequestOption: "Rate" },
                    Shipment: {
                      Shipper: defaultShipper,
                      ShipTo: {
                        Name: "Customer",
                        Address: {
                          AddressLine: recipient.AddressLine || ["Unknown"],
                          City: recipient.City || "Unknown",
                          StateProvinceCode: recipient.StateProvinceCode,
                          PostalCode: recipient.PostalCode,
                          CountryCode: "US",
                        },
                      },
                      Package: upsPackages,
                      Service: { Code: code },
                    },
                  },
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              const data = response.data.RateResponse?.RatedShipment;
              return {
                shippingOption: "UPS",
                carrierName: name,
                priceTotal: data?.TotalCharges?.MonetaryValue || null,
                apiQuoteNumber: null,
                carrierSCAC: null,
              };
            })
          );

          return results
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value);
        } catch (err) {
          console.error("UPS combined request failed:", err.response?.data || err.message);
          return [];
        }
      })(),

      // Taibeta Request (resilient + include state)
      (async () => {
        try {
          const response = await axios.put(
            "https://www.taibeta.net/PublicAPI/Shipping/getRateQuote",
            {
              authenticationKey: process.env.TAIBETA_API_KEY,
              originZipCode: "75082",
              originState:"TX",
              originCountry: 1,
              destinationZipCode: recipient?.PostalCode,
              destinationState: recipient?.StateProvinceCode || null,
              destinationCity: recipient?.City || null,
              destinationCountry: 1,
              Commodities: taibetaCommodities,
              WeightUnits: 1,
              DimensionUnits: 1,
              LegacySupport: false,
            },
            { timeout: 35000 }
          );
          if (!Array.isArray(response.data)) return [];

          return response.data
            .sort((a, b) => a.priceTotal - b.priceTotal) // en ucuzdan pahalıya
            .slice(0, 6) // ilk 6
            .map((item) => ({
              shippingOption: "Taibeta",
              carrierName: item.carrierName,
              priceTotal: item.priceTotal,
              apiQuoteNumber: item.apiQuoteNumber || null,
              carrierSCAC: item.carrierSCAC || null,
            }));
        } catch (err) {
          console.error("Taibeta combined request failed:", err.response?.data || err.message);
          return [];
        }
      })(),
    ]);

    // Her iki sağlayıcıdan gelen sonuçları birleştir, fiyata göre sırala ve ilk 6'sını gönder
    const combinedResults = [...(upsResult || []), ...(taibetaResult || [])];

    // Fiyata göre sırala (en ucuzdan pahalıya)
    const sortedResults = combinedResults
      .filter(item => item.priceTotal !== null && item.priceTotal !== undefined)
      .sort((a, b) => parseFloat(a.priceTotal) - parseFloat(b.priceTotal))
      .slice(0, 6); // İlk 6 tane

    res.json({ options: sortedResults, packing: { pallets, totalWeight, totalDeci } });
  } catch (error) {
    console.error("Combined shipping error:", error.response?.data || error.message);
    res.status(500).json({ error: error?.response?.data || error.message });
  }
});


module.exports = router;
