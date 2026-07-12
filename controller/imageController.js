const { Op } = require("sequelize");
const { Image, SubcategoryImages, ProductImages, VariantImages } = require("../db/models");
const { createAndWhere } = require("./scopes");

const getImages = async (searchItem) => {
  const opt = [];

  if (searchItem && searchItem !== "") {
    opt.push({
      [Op.or]: [{ url: { [Op.iLike]: `%${searchItem}%` } }],
    });
  }
  return await Image.findAll({ where: createAndWhere(opt) });
};

const getImageByID = async (id) => {
  return await Image.findOne({ where: { id: id } });
};

const addImage = async (url) => {
  try {
    const savedImage = await Image.create({ url });
    console.log("💾 URL veritabanına kaydedildi:", url);
    return savedImage;
  } catch (error) {
    console.error("❌ URL veritabanına kaydedilirken hata:", error);
    throw error;
  }
};

const deleteImage = async (id) => {
  try {
    await Image.destroy({ where: { id: id } });
  } catch (err) {
    console.log(err);
  }
};

const deleteImageConnections = async (type, id) => {

  try {
    if (type === "subcategory") {
      await SubcategoryImages.destroy({ where: { subcategoryId: id } });
    } else if (type === "product") {
      await ProductImages.destroy({ where: { productId: id } });
    } else if (type === "variant") {
      await VariantImages.destroy({ where: { variantId: id } });
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getImages,
  addImage,
  getImageByID,
  deleteImage,
  deleteImageConnections,
};
