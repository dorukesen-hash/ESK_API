const {
  Category,
  Subcategory,
  Product,
  PackageInfo,
  PalletInfo,
  Price,
  Spesification,
  Featured,
} = require("../db/models");
const Variant = require("../db/models/variant");
const { ProductImages, Image, VariantImages } = require("../db/models");
const XLSX = require("xlsx");
const AppError = require("../utils/appError");
const { sequelize } = require("sequelize");
const Description = require("../db/models/description");
const Dimension = require("../db/models/dimensions");

const getVariants = async () => {
  return await Variant.findAll();
};

const getVariant = async (id) => {
  return await Variant.findOne({
  where: { id },
  include: [
    { model: VariantImages, include: [{model: Image}] },
    {
      model: Featured,
      as: "FPT",
      include: [
        {
          model: Variant,
          as: "target",
          attributes: ["id", "stock", "title"],
        },
      ],
    },
  ],
});

};

const getVariantByIdList = async (ids) => {

  return await Variant.findAll({
    where: {
      id: ids,
    },
    include: [
      {
        model: VariantImages,
        include: [
          {
            model: Image,
            attributes: ["id", "url"],
          },
        ],
      }
    ],
  });
};

const getVariantOfProduct = async (id) => {
  const data = await Product.findOne({
    where: { id: id },
    include: [
      {
        model: Variant,
        include: [
          { model: Price },
          { model: PackageInfo, as: "package_info" },
          { model: PalletInfo, as: "pallet_info" },
        ],
      },
    ],
  });
  return data;
};

const saveVariant = async (data) => {
  const {
    weight,
    width,
    height,
    length,
    stock,
    type,
    subcategoryId,
    productId,
  } = data;

  let newVariant;

  if (type === "Subcategory") {
    newVariant = await Variant.create({
      ...data,
      weight: parseFloat(weight),
      width: parseFloat(width),
      height: parseFloat(height),
      length: parseFloat(length),
      stock: parseInt(stock),
      subcategoryId: subcategoryId,
    });
  } else if (type === "Product") {
    newVariant = await Variant.create({
      ...data,
      weight: parseFloat(weight),
      width: parseFloat(width),
      height: parseFloat(height),
      length: parseFloat(length),
      stock: parseInt(stock),
      productId: productId,
    });
  }

  return newVariant;
};

const updateVariant = async (data) => {
  return await Variant.update(
    {
      ...data,
    },
    {
      where: { id: data.id },
    }
  );
};

const deleteVariant = async (id) => {
  return await Variant.destroy({ where: { id: id } });
};

const uploadVariantExcel = async (hierarchyType, hierarchyId, fileBuffer) => {
  const data = XLSX.read(fileBuffer.buffer, { type: "buffer" });
  const sheetName = data.SheetNames[0]; // Dinamik sheet adı
  let rowObject = XLSX.utils.sheet_to_json(data.Sheets[sheetName], {
    defval: null,
  });

  let catId;
  let subcatId;
  let prodId;

  // Hiyerarşi ayarı
  if (hierarchyType === "category") {
    catId = hierarchyId;
  } else if (hierarchyType === "subcategory") {
    subcatId = hierarchyId;
    let cat = await Subcategory.findOne({
      where: { id: parseInt(hierarchyId) },
    });
    catId = cat.categoryId;
  } else if (hierarchyType === "product") {
    prodId = hierarchyId;
    let prod = await Product.findOne({ where: { id: parseInt(hierarchyId) } });
    catId = prod.categoryId;
    subcatId = prod.subcategoryId;

  }

  // Zorunlu alan kontrolü
  rowObject = rowObject.filter((row) => row["Stock #"] && row["Title"]);
  if (rowObject.length === 0)
    throw new AppError("Excel listesi boş veya geçersiz.", 400);

  for (const line of rowObject) {
    try {
      // Bullet points'leri JSONB line_items formatına çeviriyoruz
      const lineItems = [];
      for (let i = 1; i <= 6; i++) {
        if (line[`Bullet ${i}`]) {
          lineItems.push(line[`Bullet ${i}`]);
        }
      }

      // Variant tablosuna kayıt
      const variantData = {
        title: line["Title"] || "",
        stock: line["Stock #"] || "",
        one_four_units: line["1–4 Units"] ? parseFloat(line["1–4 Units"]) : null,
        five_nine_units: line["5–9 Units"] ? parseFloat(line["5–9 Units"]) : null,
        ten_plus_units: line["10+ Units"] ? parseFloat(line["10+ Units"]) : null,
        pallet_pricing: line["Pallet Pricing"]
          ? parseInt(line["Pallet Pricing"])
          : null,
        distributor_pallet_FOB: line["Distributor Pallet FOB"]
          ? parseFloat(line["Distributor Pallet FOB"])
          : null,
        end_user_pallet: line["End User Pallet FOB"]
          ? parseFloat(line["End User Pallet FOB"])
          : null,
        description: line["Description"] || "",
        bullet_1: line["Bullet Points 1"] || null,
        bullet_2: line["Bullet Points 2"] || null,
        bullet_3: line["Bullet Points 3"] || null,
        bullet_4: line["Bullet Points 4"] || null,
        bullet_5: line["Bullet Points 5"] || null,
        bullet_6: line["Bullet Points 6"] || null,
        pack_weight: line["pack_weight"]
          ? parseFloat(line["pack_weight"])
          : null,
        pack_width: line["pack_width"] ? parseFloat(line["pack_width"]) : null,
        pack_length: line["pack_length"]
          ? parseFloat(line["pack_length"])
          : null,
        pack_height: line["pack_height"]
          ? parseFloat(line["pack_height"])
          : null,
        quantity_case: line["Quantity / Case"]
          ? parseInt(line["Quantity / Case"])
          : null,
        units_per_pallet: line["Units per Pallet"]
          ? parseInt(line["Units per Pallet"])
          : null,
        pallet_width: line["pallet_width"]
          ? parseFloat(line["pallet_width"])
          : null,
        pallet_length: line["pallet_length"]
          ? parseFloat(line["pallet_length"])
          : null,
        pallet_height: line["pallet_height"]
          ? parseFloat(line["pallet_height"])
          : null,
        pallet_weight: line["pallet_weight"]
          ? parseFloat(line["pallet_weight"])
          : null,
        unit: line["Unit"] || "",
        pallet_contains_quantity_box: line["pallet_contains_quantity_box"]
          ? parseInt(line["pallet_contains_quantity_box"])
          : null,
        color: line["Color"] || "",
        material_type: line["Material Type"] || "",
        size: line["Size"] || "",
        style: line["Style"] || "",
        footage: line["Footage"] ? parseInt(line["Footage"]) : null,
        footage_unit_of_measure: line["Footage Unit Of Measure"] || "",
        thickness: line["Thickness"] ? line["Thickness"] : null,
        item_thickness: line["Item Thickness"] || "",
        break_strength: line["Break Strength"]
          ? parseInt(line["Break Strength"])
          : null,
        break_strength_unit_of_measure:
          line["Break Strength Unit Of Measure"] || "",
        system_strength: line["System Strength"]
          ? parseInt(line["System Strength"])
          : null,
        system_strength_unit_of_measure:
          line["System Strength Unit Of Measure"] || "",
        core_diameter: line["Core Diameter"]
          ? parseInt(line["Core Diameter"])
          : null,
        core_diameter_unit_of_measure:
          line["Core Diameter Unit Of Measure"] || "",
        core_weight: line["Core Weight"] ? parseInt(line["Core Weight"]) : null,
        core_weight_unit_of_measure: line["Core Weight Unit Of Measure"] || "",
        outside_diameter: line["Outside Diameter"]
          ? parseInt(line["Outside Diameter"])
          : null,
        outside_diameter_unit_of_measure:
          line["Outside Diameter Unit Of Measure"] || "",
        wire_diameter: line["Wire Diameter"]
          ? parseInt(line["Wire Diameter"])
          : null,
        wire_diameter_unit_of_measure:
          line["Wire Diameter Unit Of Measure"] || "",
        elongation: line["Elongation"] ? parseInt(line["Elongation"]) : null,
        elongation_unit_of_measure: line["Elongation Unit Of Measure"] || "",
        item_gross_weight_unit_of_measure:
          line["Item Gross Weight Unit Of Measure"] || "",
        item_width_unit_of_measure: line["Item Width Unit Of Measure"] || "",
        item_length_unit_of_measure: line["Item Length Unit Of Measure"] || "",
        item_height_unit_of_measure: line["Item Height Unit Of Measure"] || "",
        package_weight_unit_of_measure:
          line["Package Weight Unit Of Measure"] || "",
        shipping_weight: line["Shipping Weight"]
          ? parseInt(line["Shipping Weight"])
          : null,
        shipping_weight_unit_of_measure:
          line["Shipping Weight Unit Of Measure"] || "",
        dimensional_weight: line["Dimensional Weight"]
          ? parseInt(line["Dimensional Weight"])
          : null,
        dimensional_weight_unit_of_measure:
          line["Dimensional Weight Unit Of Measure"] || "",
        package_height_unit_of_measure:
          line["Package Height Unit Of Measure"] || "",
        package_width_unit_of_measure:
          line["Package Width Unit Of Measure"] || "",
        package_length_unit_of_measure:
          line["Package Length Unit Of Measure"] || "",
        pallet_weight_unit_of_measure:
          line["Pallet Weight Unit Of Measure"] || "",
        pallet_height_unit_of_measure:
          line["Pallet Height Unit Of Measure"] || "",
        pallet_width_unit_of_measure:
          line["Pallet Width Unit Of Measure"] || "",
        pallet_length_unit_of_measure:
          line["Pallet Length Unit Of Measure"] || "",
        min_order_quantity_unit: line["Min Order Quantity_Unit"]
          ? parseInt(line["Min Order Quantity_Unit"])
          : null,
        bundle_bale_qty: line["Bundle / Bale Qty."]
          ? line["Bundle / Bale Qty."]
          : null,
        inside_diameter: line["Inside Diameter"]
          ? parseInt(line["Inside Diameter"])
          : null,
        inside_diameter_unit_of_measure:
          line["Inside Diameter Unit Of Measure"] || "",
        inside_dimensions: line["Inside Dimensions"] || "",
        item_gross_weight: line["Item Gross Weight"]
          ? parseInt(line["Item Gross Weight"])
          : null,
        item_net_weight: line["Item Net Weight"]
          ? parseInt(line["Item Net Weight"])
          : null,
        item_net_weight_unit_of_measure:
          line["Item Net Weight Unit Of Measure"] || "",
        outside_w_l: line["Outside (W x L)"] || "",
        product_finish: line["Product Finish"] || "",
        product_grade: line["Product Grade"] || "",
        status: line["Status"] || "",
        usable_w_l: line["Usable (W x L)"] || "",
        available: line["Available"] ? true : false,
        extradata: {
          line_items: lineItems,
        },
      };

      // Hiyerarşi ekleme
      if (hierarchyType === "category") {
        variantData.categoryId = parseInt(catId);
      } else if (hierarchyType === "subcategory") {
        variantData.categoryId = parseInt(catId);
        variantData.subcategoryId = parseInt(subcatId);
      } else if (hierarchyType === "product") {
        variantData.categoryId = catId;
        variantData.subcategoryId = subcatId;
        variantData.productId = prodId;
      }

      await Variant.create(variantData);
    } catch (error) {
      console.error("Hata:", line["Stock #"], error);
      throw new AppError(`Variant oluşturulamadı: ${line["Stock #"]}`, 500);
    }
  }
};

const dataForExcelDropdown = async (data) => {
  let result;
  if (data === "category") {
    result = await Category.findAll();
  } else if (data === "subcategory") {
    result = await Subcategory.findAll();
  } else if (data === "product") {
    result = await Product.findAll();

    result = result.map((item) => ({ id: item.id, name: item.title }));
  }

  return result;
};

module.exports = {
  getVariants,
  getVariant,
  saveVariant,
  deleteVariant,
  updateVariant,
  getVariantOfProduct,
  uploadVariantExcel,
  dataForExcelDropdown,
  getVariantByIdList,
};
