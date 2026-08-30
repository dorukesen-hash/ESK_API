// Canonical field <-> Excel header mapping for the Variants bulk export/import.
// Header strings are copied EXACTLY from the existing hierarchy-scoped upload
// parser (controller/variantController.js's uploadVariantExcel), so a sheet
// exported here re-uploads correctly there too, and vice versa - one Excel
// format for the whole app, not two.
//
// type: "number" fields are Postgres INTEGER (a non-integer crashes the
// write) EXCEPT where decimal:true. The Sequelize model (db/models/variant.js)
// declares most of these INTEGER, but the REAL production schema disagrees
// for several - confirmed live via information_schema.columns, not assumed:
// one_four_units/five_nine_units/ten_plus_units/pallet_pricing/pack_weight/
// pack_width/pack_length/pack_height/pallet_width/pallet_length/pallet_height/
// pallet_weight/distributor_pallet_FOB are all real NUMERIC(10,2) columns.
// Rounding these would silently truncate real cents-precision data - this is
// the same class of model/DB drift already documented for the Claim model's
// timestamp columns; mirrored in ESK_ADMIN's variantFieldConfig.js.
const VARIANT_EXCEL_COLUMNS = [
  { field: "stock", header: "Stock #", type: "text" },
  { field: "title", header: "Title", type: "text" },
  { field: "one_four_units", header: "1–4 Units", type: "number", decimal: true },
  { field: "five_nine_units", header: "5–9 Units", type: "number", decimal: true },
  { field: "ten_plus_units", header: "10+ Units", type: "number", decimal: true },
  { field: "pallet_pricing", header: "Pallet Pricing", type: "number", decimal: true },
  { field: "distributor_pallet_FOB", header: "Distributor Pallet FOB", type: "number", decimal: true },
  { field: "end_user_pallet", header: "End User Pallet FOB", type: "number" },
  { field: "description", header: "Description", type: "text" },
  { field: "bullet_1", header: "Bullet Points 1", type: "text" },
  { field: "bullet_2", header: "Bullet Points 2", type: "text" },
  { field: "bullet_3", header: "Bullet Points 3", type: "text" },
  { field: "bullet_4", header: "Bullet Points 4", type: "text" },
  { field: "bullet_5", header: "Bullet Points 5", type: "text" },
  { field: "bullet_6", header: "Bullet Points 6", type: "text" },
  { field: "pack_weight", header: "pack_weight", type: "number", decimal: true },
  { field: "pack_width", header: "pack_width", type: "number", decimal: true },
  { field: "pack_length", header: "pack_length", type: "number", decimal: true },
  { field: "pack_height", header: "pack_height", type: "number", decimal: true },
  { field: "quantity_case", header: "Quantity / Case", type: "number" },
  { field: "units_per_pallet", header: "Units per Pallet", type: "number" },
  { field: "pallet_width", header: "pallet_width", type: "number", decimal: true },
  { field: "pallet_length", header: "pallet_length", type: "number", decimal: true },
  { field: "pallet_height", header: "pallet_height", type: "number", decimal: true },
  { field: "pallet_weight", header: "pallet_weight", type: "number", decimal: true },
  { field: "unit", header: "Unit", type: "text" },
  { field: "pallet_contains_quantity_box", header: "pallet_contains_quantity_box", type: "number" },
  { field: "color", header: "Color", type: "text" },
  { field: "material_type", header: "Material Type", type: "text" },
  { field: "size", header: "Size", type: "text" },
  { field: "style", header: "Style", type: "text" },
  { field: "footage", header: "Footage", type: "number" },
  { field: "footage_unit_of_measure", header: "Footage Unit Of Measure", type: "text" },
  { field: "thickness", header: "Thickness", type: "text" },
  { field: "item_thickness", header: "Item Thickness", type: "text" },
  { field: "break_strength", header: "Break Strength", type: "number" },
  { field: "break_strength_unit_of_measure", header: "Break Strength Unit Of Measure", type: "text" },
  { field: "system_strength", header: "System Strength", type: "number" },
  { field: "system_strength_unit_of_measure", header: "System Strength Unit Of Measure", type: "text" },
  { field: "core_diameter", header: "Core Diameter", type: "number" },
  { field: "core_diameter_unit_of_measure", header: "Core Diameter Unit Of Measure", type: "text" },
  { field: "core_weight", header: "Core Weight", type: "number" },
  { field: "core_weight_unit_of_measure", header: "Core Weight Unit Of Measure", type: "text" },
  { field: "outside_diameter", header: "Outside Diameter", type: "number" },
  { field: "outside_diameter_unit_of_measure", header: "Outside Diameter Unit Of Measure", type: "text" },
  { field: "wire_diameter", header: "Wire Diameter", type: "number" },
  { field: "wire_diameter_unit_of_measure", header: "Wire Diameter Unit Of Measure", type: "text" },
  { field: "elongation", header: "Elongation", type: "number" },
  { field: "elongation_unit_of_measure", header: "Elongation Unit Of Measure", type: "text" },
  { field: "item_gross_weight", header: "Item Gross Weight", type: "number" },
  { field: "item_gross_weight_unit_of_measure", header: "Item Gross Weight Unit Of Measure", type: "text" },
  { field: "item_net_weight", header: "Item Net Weight", type: "number" },
  { field: "item_net_weight_unit_of_measure", header: "Item Net Weight Unit Of Measure", type: "text" },
  { field: "item_width_unit_of_measure", header: "Item Width Unit Of Measure", type: "text" },
  { field: "item_length_unit_of_measure", header: "Item Length Unit Of Measure", type: "text" },
  { field: "item_height_unit_of_measure", header: "Item Height Unit Of Measure", type: "text" },
  { field: "package_weight_unit_of_measure", header: "Package Weight Unit Of Measure", type: "text" },
  { field: "shipping_weight", header: "Shipping Weight", type: "number" },
  { field: "shipping_weight_unit_of_measure", header: "Shipping Weight Unit Of Measure", type: "text" },
  { field: "dimensional_weight", header: "Dimensional Weight", type: "number" },
  { field: "dimensional_weight_unit_of_measure", header: "Dimensional Weight Unit Of Measure", type: "text" },
  { field: "package_height_unit_of_measure", header: "Package Height Unit Of Measure", type: "text" },
  { field: "package_width_unit_of_measure", header: "Package Width Unit Of Measure", type: "text" },
  { field: "package_length_unit_of_measure", header: "Package Length Unit Of Measure", type: "text" },
  { field: "pallet_weight_unit_of_measure", header: "Pallet Weight Unit Of Measure", type: "text" },
  { field: "pallet_height_unit_of_measure", header: "Pallet Height Unit Of Measure", type: "text" },
  { field: "pallet_width_unit_of_measure", header: "Pallet Width Unit Of Measure", type: "text" },
  { field: "pallet_length_unit_of_measure", header: "Pallet Length Unit Of Measure", type: "text" },
  { field: "min_order_quantity_unit", header: "Min Order Quantity_Unit", type: "number" },
  { field: "bundle_bale_qty", header: "Bundle / Bale Qty.", type: "text" },
  { field: "inside_diameter", header: "Inside Diameter", type: "number" },
  { field: "inside_diameter_unit_of_measure", header: "Inside Diameter Unit Of Measure", type: "text" },
  { field: "inside_dimensions", header: "Inside Dimensions", type: "text" },
  { field: "outside_w_l", header: "Outside (W x L)", type: "text" },
  { field: "product_finish", header: "Product Finish", type: "text" },
  { field: "product_grade", header: "Product Grade", type: "text" },
  { field: "status", header: "Status", type: "text" },
  { field: "usable_w_l", header: "Usable (W x L)", type: "text" },
  { field: "available", header: "Available", type: "boolean" },
];

module.exports = { VARIANT_EXCEL_COLUMNS };
