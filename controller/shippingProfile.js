const { ShippingProfiles } = require("../db/models");
const AppError = require("../utils/appError");

const getShippingprofiles = async (userId) => {
  return await ShippingProfiles.findAll({where: {userId: userId}});
};

const saveShippingprofiles = async (param) => {
  const {user, body} = param
    if (!user || !user.id) throw new AppError("User not found!", 500);
    const newProfile = {
        ...body,
        userId: user.id
    }
    return ShippingProfiles.create(newProfile);
};

const editShippingprofiles = async (param) => {
  if (!param.id) throw new AppError("Id not found!", 500);
  return await ShippingProfiles.update(
    { ...param.addressInfo },
    { where: { id: param.id } }
  );
};

const deleteShippingprofiles = async (id) => {
    console.log("deleting address:", id);
    try {
        const deletedCount = await ShippingProfiles.destroy({ where: { id: id } });
        if (deletedCount === 0) {
            throw new AppError("Shipping profile not found or could not be deleted!", 404);
        }
        return 1;
    } catch (error) {
        throw new AppError(error.message || "Shipping profile could not be deleted!", 500);
    }
};

module.exports = {
  getShippingprofiles,
  saveShippingprofiles,
  editShippingprofiles,
  deleteShippingprofiles,
};
