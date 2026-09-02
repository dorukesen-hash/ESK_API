const AppError = require('./appError');

// Standard US pallet footprint + limits this business ships on. All
// tunable - adjust if the real warehouse/carrier constraints differ.
const PALLET_LENGTH_IN = 48;
const PALLET_WIDTH_IN = 44;
const PALLET_DECK_HEIGHT_IN = 6; // the physical pallet's own height
const PALLET_MAX_TOTAL_HEIGHT_IN = 84; // content + deck, common trucking-safe max
const PALLET_MAX_CONTENT_HEIGHT_IN = PALLET_MAX_TOTAL_HEIGHT_IN - PALLET_DECK_HEIGHT_IN;
const PALLET_MAX_WEIGHT_LB = 2200; // common LTL per-pallet weight cap
const PALLET_TARE_WEIGHT_LB = 40; // empty wood pallet weight - carriers weigh the whole thing
const PALLET_BASE_AREA_SQIN = PALLET_LENGTH_IN * PALLET_WIDTH_IN;

// US domestic dimensional-weight (DIM weight) divisor, in³/lb - the
// standard UPS/FedEx domestic divisor. Everything here is inches/pounds
// only - no cm, no metric "desi" convention.
const DIM_WEIGHT_DIVISOR = 139;

// Best 2D grid fit for one box footprint within the pallet base, trying
// both orientations (rotated 90°) and keeping whichever fits more per layer.
function bestLayerFit(boxLength, boxWidth) {
  if (!boxLength || !boxWidth) return { perLayer: 0, footprintL: 0, footprintW: 0 };
  const a = { nx: Math.floor(PALLET_LENGTH_IN / boxLength), ny: Math.floor(PALLET_WIDTH_IN / boxWidth) };
  const b = { nx: Math.floor(PALLET_LENGTH_IN / boxWidth), ny: Math.floor(PALLET_WIDTH_IN / boxLength) };
  const perLayerA = a.nx * a.ny;
  const perLayerB = b.nx * b.ny;
  return perLayerA >= perLayerB
    ? { perLayer: perLayerA, footprintL: boxLength, footprintW: boxWidth }
    : { perLayer: perLayerB, footprintL: boxWidth, footprintW: boxLength };
}

// items: [{ sku, length, width, height, weight, quantity }] - real per-
// package (pack_*) dimensions/weight, already resolved from the DB. Never
// pass pallet_* fields in here - those are wholesale-pricing reference
// data, unrelated to how loose units actually get packed for shipping.
//
// Algorithm (deliberately not full 3D bin-packing - this is for accurate
// pallet count / weight / deci for freight pricing, not a warehouse
// packing diagram):
//   1. Full layers: for each SKU, place as many complete single-SKU
//      layers as its quantity allows - the space-efficient case, no
//      mixing needed since a full layer already uses 100% of the base.
//   2. Leftover (less-than-a-full-layer) quantities from different SKUs
//      are combined into shared layers by footprint area, instead of each
//      wasting an entire layer to itself (the bug in the old
//      single-SKU-per-layer algorithm).
//   3. Layers (tallest first) are stacked into pallets, opening a new
//      pallet whenever the next layer would exceed max content height or
//      max weight.
function calculatePalletPacking(items) {
  const groups = (items || [])
    .filter((i) => Number(i.quantity) > 0)
    .map((i) => {
      const fit = bestLayerFit(Number(i.length) || 0, Number(i.width) || 0);
      return {
        sku: i.sku,
        height: Number(i.height) || 0,
        weight: Number(i.weight) || 0,
        remainingQty: Number(i.quantity),
        perLayer: fit.perLayer,
        footprintArea: fit.footprintL * fit.footprintW,
      };
    });

  const unpackable = groups.filter((g) => g.perLayer === 0 || g.height <= 0 || g.weight <= 0);
  if (unpackable.length > 0) {
    throw new AppError(
      `Missing/invalid package dimensions for: ${unpackable.map((g) => g.sku).join(', ')}. Cannot calculate pallet shipping.`,
      400
    );
  }

  const layers = [];

  // Pass 1: full single-SKU layers.
  for (const g of groups) {
    while (g.remainingQty >= g.perLayer) {
      layers.push({ height: g.height, weight: g.weight * g.perLayer });
      g.remainingQty -= g.perLayer;
    }
  }

  // Pass 2: combine leftovers across SKUs into shared layers, largest
  // (by total footprint needed) first.
  const leftovers = groups
    .filter((g) => g.remainingQty > 0)
    .sort((a, b) => b.footprintArea * b.remainingQty - a.footprintArea * a.remainingQty);

  const sharedLayers = [];
  for (const g of leftovers) {
    while (g.remainingQty > 0) {
      let target = sharedLayers.find((l) => PALLET_BASE_AREA_SQIN - l.usedArea >= g.footprintArea);
      if (!target) {
        target = { usedArea: 0, height: 0, weight: 0 };
        sharedLayers.push(target);
      }
      const maxByArea = Math.floor((PALLET_BASE_AREA_SQIN - target.usedArea) / g.footprintArea);
      const qtyPlaced = Math.min(g.remainingQty, maxByArea);
      if (qtyPlaced <= 0) break; // safety guard, shouldn't happen given the .find condition above
      target.usedArea += qtyPlaced * g.footprintArea;
      target.height = Math.max(target.height, g.height);
      target.weight += qtyPlaced * g.weight;
      g.remainingQty -= qtyPlaced;
    }
  }
  for (const l of sharedLayers) {
    layers.push({ height: l.height, weight: l.weight });
  }

  // First-Fit-Decreasing by height - a standard, cheap improvement over
  // packing layers in arbitrary order for this reduced (height, weight)
  // bin-packing pass.
  layers.sort((a, b) => b.height - a.height);

  const maxContentWeight = PALLET_MAX_WEIGHT_LB - PALLET_TARE_WEIGHT_LB;
  const pallets = [];
  let current = null;
  for (const layer of layers) {
    if (
      !current ||
      current.contentHeight + layer.height > PALLET_MAX_CONTENT_HEIGHT_IN ||
      current.weight + layer.weight > maxContentWeight
    ) {
      current = { contentHeight: 0, weight: 0 };
      pallets.push(current);
    }
    current.contentHeight += layer.height;
    current.weight += layer.weight;
  }

  const result = pallets.map((p) => {
    const height = PALLET_DECK_HEIGHT_IN + p.contentHeight;
    return {
      length: PALLET_LENGTH_IN,
      width: PALLET_WIDTH_IN,
      height,
      weight: PALLET_TARE_WEIGHT_LB + p.weight,
      // Dimensional weight (lb) of the full pallet footprint, US domestic
      // formula: (L x W x H in inches) / 139. Round up, like every US
      // carrier's own DIM-weight billing does.
      deci: Math.ceil((PALLET_LENGTH_IN * PALLET_WIDTH_IN * height) / DIM_WEIGHT_DIVISOR),
    };
  });

  return {
    pallets: result,
    totalWeight: result.reduce((sum, p) => sum + p.weight, 0),
    totalDeci: result.reduce((sum, p) => sum + p.deci, 0),
  };
}

module.exports = { calculatePalletPacking };
