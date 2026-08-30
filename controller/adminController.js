const { Sequelize, Op } = require("sequelize");
const {
  Category,
  Subcategory,
  Product,
  Variant,
  SubcategoryImages,
  Image,
  ProductImages,
  VariantImages,
} = require("../db/models");
const Description = require("../db/models/description");
const { createAndWhere } = require("./scopes");
const { logVariantFieldChanges, logVariantDelete } = require("./variantAuditController");

//ADMIN -PRODUCTS - CATEGORIES TAB / GET ALL
const getCategoriesforAdmin = async () => {
  return await Category.findAndCountAll({});
};

//ADMIN -PRODUCTS - CATEGORIES TAB / ADD
const addCategoryAdmin = async (data) => {
  const { name } = data;
  return await Category.create({ name: name });
};

//ADMIN -PRODUCTS - CATEGORIES TAB / UPDATE
const updateCategoryAdmin = async (data) => {
  const { name, id } = data;
  return await Category.update({ name }, { where: { id: parseInt(id) } });
};

//ADMIN -PRODUCTS - CATEGORIES TAB / DELETE
const deleteCategoryAdmin = async (id) => {
  await Variant.destroy({ where: { categoryId: parseInt(id) } });
  await Product.destroy({ where: { categoryId: parseInt(id) } });
  await Subcategory.destroy({ where: { categoryId: parseInt(id) } });
  return await Category.destroy({ where: { id: parseInt(id) } });
};

//ADMIN -PRODUCTS - SUBCATEGORIES TAB / GET ALL
const getSubCategoriesforAdmin = async (searchItem) => {
  const opt = [];
  const categoryWhere = {};

  if (searchItem && searchItem !== "") {
    opt.push({
      [Op.or]: [{ name: { [Op.iLike]: `%${searchItem}%` } }],
    });
    categoryWhere.name = { [Op.iLike]: `%${searchItem}%` };
  }

  return await Subcategory.findAndCountAll({
    where: createAndWhere(opt),
    include: [
      {
        model: Category,
        where:
          Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
        required: false,
      },
      { model: Variant, attributes: ["id", "title", "stock"] },
      { model: Product, attributes: ["id", "title"] },
      { model: SubcategoryImages, include: [{ model: Image }] },
    ],
  });
};

//ADMIN -PRODUCTS - SUBCATEGORIES TAB / ADD
const addSubCategoryAdmin = async (data) => {
  const { name, categoryId, description, list_items, variants, available } =
    data;

  const desc = await Description.create({
    text: description,
    list_items: list_items,
  });

  const subcategory = await Subcategory.create({
    name: name,
    categoryId: categoryId,
    description_id: desc.id,
    sell_product: variants && variants.length > 0 ? true : false,
    available: available ? available : false,
  });

  if (variants && variants.length > 0) {
    const variantCreateList = variants.map((item) => ({
      ...item,
      categoryId: categoryId,
      subcategoryId: subcategory.id,
    }));
    await Variant.bulkCreate(variantCreateList);
  }

  return await Subcategory.findOne({
    where: { id: subcategory.id },
    include: [{ model: Variant }],
  });
};

//ADMIN -PRODUCTS - SUBCATEGORIES TAB / UPDATE
const updateSubCategoryAdmin = async (data) => {
  const { id, name, available, description_id, description, desc2,variants } = data;

  try {
    let descId;

    if (description_id) {
      await Description.update(
        {
          text: description || "",
          list_items: desc2.list_items || [],
        },
        { where: { id: description_id } }
      );
      descId = description_id;
    } else {
      const Desc = await Description.create({
        text: description || "",
        list_items: desc2.list_items || [],
      });
      descId = Desc.id;
    }

    await Subcategory.update(
      { name: name, available: available },
      { where: { id: id } }
    );

    // 2. Variant Güncelleme - variants is optional; omitting it (or sending
    // undefined) must leave existing variants untouched, not wipe them.
    if (variants) {
      const existingVariants = await Variant.findAll({
        where: { subcategoryId: id }
      });

      const incomingVariantIds = variants.map((v) => v.id).filter(Boolean); // id si olanları al
      const existingVariantIds = existingVariants.map((v) => v.id);

      // Silinmesi gereken varyantları bul (DB'de var ama gönderilen listede yok)
      const variantsToDelete = existingVariantIds.filter(
        (id) => !incomingVariantIds.includes(id)
      );
      await Variant.destroy({ where: { id: variantsToDelete } });

      for (const variant of variants) {
        if (!variant.id) {
          // Yeni varyant ekle
          await Variant.create(
            { ...variant, subcategoryId: id, categoryId: data.categoryId }
          );
        } else {
          // Mevcut varyantı güncelle
          await Variant.update(
            {
              title: variant.title,
              sku: variant.sku,
              stockLevel: variant.stockLevel,
            },
            { where: { id: variant.id } }
          );
        }
      }
    }

    return { success: true, message: "Subcategory updated successfully" };
  } catch (error) {
    console.error("Error updating subcategory:", error);
    throw new Error("Update failed");
  }
};

//ADMIN -PRODUCTS - SUBCATEGORIES TAB / DELETE
const deleteSubCategoryAdmin = async (id) => {
  await Variant.destroy({ where: { subcategoryId: parseInt(id) } });
  await Product.destroy({ where: { subcategoryId: parseInt(id) } });
  return await Subcategory.destroy({ where: { id: parseInt(id) } });
};

//ADMIN -PRODUCTS - PRODUCT TAB / GET ALL
const getProductsforAdmin = async (searchItem) => {
  const opt = [];
  const subcategoryWhere = {};
  const categoryWhere = {};

  if (searchItem && searchItem !== "") {
    opt.push({
      [Op.or]: [{ title: { [Op.iLike]: `%${searchItem}%` } }],
    });
    subcategoryWhere.name = { [Op.iLike]: `%${searchItem}%` };
    categoryWhere.name = { [Op.iLike]: `%${searchItem}%` };
  }

  return await Product.findAndCountAll({
    where: createAndWhere(opt),
    include: [
      { model: Category, attributes: ["id", "name"] },
      { model: Subcategory, attributes: ["id", "name"] },
      { model: Variant, attributes: ["id", "title", "stock"] },
      { model: ProductImages, include: [{ model: Image }] },
    ],
  });
};

//ADMIN -PRODUCTS - PRODUCT TAB / ADD
const addProductAdmin = async (data) => {
  const {
    title,
    categoryId,
    subcategoryId,
    description,
    list_items,
    variants,
    available,
  } = data;

  const product = await Product.create({
    title: title,
    categoryId: categoryId,
    subcategoryId: subcategoryId,
    description: description ? description : "",
    extradata: list_items,
    available: available ? available : false,
  });

  if (variants && variants.length > 0) {
    const variantCreateList = variants.map((item) => ({
      ...item,
      stock: item.stock,
      categoryId: categoryId,
      subcategoryId: subcategoryId,
      productId: product.id,
    }));
    await Variant.bulkCreate(variantCreateList);
  }

  return await Product.findOne({
    where: { id: product.id },
    include: [{ model: Variant }],
  });
};

//ADMIN -PRODUCTS - PRODUCT TAB / UPDATE
const updateProductAdmin = async (data) => {
  const { id, title, sku, available,list_items, description,variants } = data;

  try {

    const productFields = {
      title: title,
      sku: sku,
      available: available,
      description: description,
    };
    // list_items is optional; omitting it must leave existing extradata
    // untouched (ProductFormModal used to always send [], silently wiping
    // any real bullet-point content on every unrelated edit - same class of
    // bug as the variants-array one below, fixed the same way).
    if (list_items !== undefined) {
      productFields.extradata = list_items;
    }

    await Product.update(productFields, { where: { id: id } });

    // variants is optional; omitting it (or sending undefined) must leave
    // existing variants untouched, not wipe them.
    if (variants) {
      const existingVariants = await Variant.findAll({
        where: { productId: id },
      });

      const incomingVariantIds = variants.map((v) => v.id).filter(Boolean); // id si olanları al
      const existingVariantIds = existingVariants.map((v) => v.id);

      // Silinmesi gereken varyantları bul (DB'de var ama gönderilen listede yok)
      const variantsToDelete = existingVariantIds.filter(
        (id) => !incomingVariantIds.includes(id)
      );
      await Variant.destroy({ where: { id: variantsToDelete } });

      for (const variant of variants) {
        if (!variant.id) {
          // Yeni varyant ekle
          await Variant.create({
            ...variant,
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId,
            productId: id,
          });
        } else {
          // Mevcut varyantı güncelle
          await Variant.update(
            {
              title: variant.title,
              sku: variant.sku,
              stockLevel: variant.stockLevel,
            },
            { where: { id: variant.id } }
          );
        }
      }
    }

    return { success: true, message: "Product updated successfully" };
  } catch (error) {
    //
    console.error("Error updating product:", error);
  }
};

//ADMIN -PRODUCTS - PRODUCT TAB / DELETE
const deleteProductAdmin = async (id) => {
  await Variant.destroy({ where: { productId: parseInt(id) } });
  return await Product.destroy({ where: { id: id } });
};

const getVariantsForAdmin = async (data) => {
  const { limit, page, globalFilter, sorting, categoryId, subcategoryId, productId } = data;

  const limitx = parseInt(limit ? limit : 10);
  const offset = parseInt(page ? page : 0) * limit;

  const order =
    !sorting || sorting.length < 1
      ? [["createdAt", "ASC"]]
      : [...sorting.map((x) => [x.id, x.desc === true ? "DESC" : "ASC"])];

  const opt = [];

  if (globalFilter && globalFilter !== "") {
    opt.push({
      [Op.or]: [
        {
          title: {
            [Op.iLike]: `%${decodeURIComponent(globalFilter)}%`,
          },
        },
        { stock: { [Op.iLike]: `%${decodeURIComponent(globalFilter)}%` } },
      ],
    });
  }

  // categoryId/subcategoryId are denormalized ancestor pointers set on every
  // descendant variant (a variant under a product still carries its
  // grandparent subcategoryId/categoryId), so a level's "direct" variants
  // must exclude rows that actually belong to a deeper level.
  if (productId) {
    opt.push({ productId: parseInt(productId) });
  } else if (subcategoryId) {
    opt.push({ subcategoryId: parseInt(subcategoryId), productId: null });
  } else if (categoryId) {
    opt.push({ categoryId: parseInt(categoryId), subcategoryId: null });
  }

  return await Variant.findAndCountAll({
    limit: limitx,
    offset: offset,
    where: createAndWhere(opt),
    distinct: false,
    order: order,
    include: [
      {
        model: Category,
      },
      {
        model: Subcategory,
      },
      {
        model: Product,
      },
      { model: VariantImages, include: [{ model: Image }] },
    ],
  });
};

const addVariantForAdmin = async (data) => {};

const updateVariantForAdmin = async (data, userId) => {
  const { id, ...fields } = data;

  const existing = await Variant.findByPk(id);
  await logVariantFieldChanges(id, userId, existing, fields);

  await Variant.update(
    {
      ...fields
    },
    { where: { id } }
  );

  return { success: true, message: "Variant updated successfully" };
};

const deleteVariantForAdmin = async (id, userId) => {
  const existing = await Variant.findByPk(id);
  if (existing) {
    await logVariantDelete(id, userId, existing);
  }
  return await Variant.destroy({ where: { id } });
};

// Admin-curated "Featured" list - a variant is either featured or not
// (`featured` boolean), ordered by `featured_position` for the homepage grid.
const getFeaturedVariantsForAdmin = async () => {
  return await Variant.findAll({
    where: { featured: true },
    order: [
      ["featured_position", "ASC"],
      ["id", "ASC"],
    ],
  });
};

module.exports = {
  getCategoriesforAdmin,
  getVariantsForAdmin,
  updateCategoryAdmin,
  deleteCategoryAdmin,
  addCategoryAdmin,
  getSubCategoriesforAdmin,
  addSubCategoryAdmin,
  updateSubCategoryAdmin,
  deleteSubCategoryAdmin,
  getProductsforAdmin,
  addProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  addVariantForAdmin,
  updateVariantForAdmin,
  deleteVariantForAdmin,
  getFeaturedVariantsForAdmin,
};
