const Sequelize = require("sequelize");
const db = require("../index.js");

const Variant = db.define("variant", {
  title: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  stock: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  extradata: {
    type: Sequelize.JSONB,
    allowNull: true,
  },
  one_four_units: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  five_nine_units: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  ten_plus_units: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  pallet_pricing: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  distributor_pallet_FOB: {
    type: Sequelize.DECIMAL(10,2),
    allowNull: true,
  },
  end_user_pallet: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  bullet_1: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  bullet_2: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  bullet_3: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  bullet_4: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  bullet_5: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  bullet_6: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
pack_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pack_width: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pack_length: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pack_height: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pack_height: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
quantity_case: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
units_per_pallet: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pallet_width: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pallet_length: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pallet_height: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pallet_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
pallet_length: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  unit: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  pallet_contains_quantity_box: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
color: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  material_type: {
    type: Sequelize.STRING,
    allowNull: true,
  },
size: {
    type: Sequelize.STRING,
    allowNull: true,
  },
style: {
    type: Sequelize.STRING,
    allowNull: true,
  },
footage: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
footage_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
thickness: {
    type: Sequelize.STRING,
    allowNull: true,
  },
item_thickness: {
    type: Sequelize.STRING,
    allowNull: true,
  },
break_strength: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
break_strength_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
system_strength: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
system_strength_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
core_diameter: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
core_diameter_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
core_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
core_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
outside_diameter: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
outside_diameter_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
wire_diameter: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
wire_diameter_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
elongation: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
elongation_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
item_gross_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
item_width_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
item_length_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
item_height_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
package_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
shipping_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
shipping_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
dimensional_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
dimensional_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
package_height_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
package_width_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
package_length_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
pallet_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
pallet_height_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
pallet_width_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
pallet_length_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
min_order_quantity_unit: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
bundle_bale_qty: {
    type: Sequelize.STRING,
    allowNull: true,
  },
inside_diameter: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
inside_diameter_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
inside_dimensions: {
    type: Sequelize.STRING,
    allowNull: true,
  },
item_gross_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
item_net_weight: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
item_net_weight_unit_of_measure: {
    type: Sequelize.STRING,
    allowNull: true,
  },
outside_w_l: {
    type: Sequelize.STRING,
    allowNull: true,
  },
product_finish: {
    type: Sequelize.STRING,
    allowNull: true,
  },
product_grade: {
    type: Sequelize.STRING,
    allowNull: true,
  },
status: {
    type: Sequelize.STRING,
    allowNull: true,
  },
usable_w_l: {
    type: Sequelize.STRING,
    allowNull: true,
  },
available: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
featured: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
featured_position: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
});

module.exports = Variant;
