const Carrier = require('./carrier')
const CarrierPrice = require('./carrierPrice')
const Category = require('./category')
const Subcategory = require('./subCategory')
const Cookie = require('./cookie')
const Cart = require('./cart')
const Customer = require('./customer')
const Deci = require('./deci')
const Invoice = require('./invoice')
const Order = require('./order')
const OrderItem = require('./orderItem')
const OrderItemStatus = require('./orderItemStatus')
const OrderStatus = require('./orderStatus')
const Product = require('./product')
const Shipment = require('./shipment')
const ShipmentStatus = require('./shipmentStatus')
const Transaction = require('./transaction')
const User = require('./user')
const Variant = require('./variant')
const VariantImages = require('./variantImages')
const ProductImages = require('./productImages')
const SubcategoryImages = require('./subcategoryImages')
const Image = require('./image')
const Price = require('./price')
const Spesification = require('./spesification')
const SpesificationImages = require('./spesificationImage')
const Dimensions = require('./dimensions')
const PackageInfo = require('./packageInfo')
const PalletInfo = require('./palletInfo')
const SpecialPrices = require('./specialPrices')
const ShippingProfiles = require('./shippingProfiles')
const Description = require('./description')
const Billing = require('./billing')
const Featured = require('./featured')
const Claim = require('./claim')
const VariantAuditLog = require('./variantAuditLog')
const DiscountCode = require('./discountCode')
const DiscountCodeRedemption = require('./discountCodeRedemption')
const PricingAuditLog = require('./pricingAuditLog')


User.hasMany(Category);
Category.belongsTo(User);

Category.hasMany(Subcategory);
Subcategory.belongsTo(Category);

User.hasMany(Customer);
Customer.belongsTo(User);

User.hasMany(Invoice);
Invoice.belongsTo(User);

User.hasMany(Order);
Order.belongsTo(User);

Cart.hasMany(User);
User.belongsTo(Cart);

User.hasMany(Cookie);
Cookie.belongsTo(User);

User.hasMany(OrderItem);
OrderItem.belongsTo(User);

User.hasMany(Product);
Product.belongsTo(User);

User.hasMany(Shipment);
Shipment.belongsTo(User);

User.hasMany(ShippingProfiles);
ShippingProfiles.belongsTo(User);

User.hasMany(Billing);
Billing.belongsTo(User);

Billing.hasMany(Order);
Order.belongsTo(Billing);

Carrier.hasMany(CarrierPrice);
CarrierPrice.belongsTo(Carrier);

Deci.hasMany(CarrierPrice);
CarrierPrice.belongsTo(Deci);

Carrier.hasMany(Shipment)
Shipment.belongsTo(Carrier);

Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);

Variant.hasMany(OrderItem, { foreignKey: 'variant_id' });
OrderItem.belongsTo(Variant, { as: 'variantRef', foreignKey: 'variant_id' });

Shipment.hasMany(Order);
Order.belongsTo(Shipment);

ShipmentStatus.hasMany(Shipment);
Shipment.belongsTo(ShipmentStatus);

Invoice.hasMany(Order);
Order.belongsTo(Invoice);

OrderStatus.hasMany(Order);
Order.belongsTo(OrderStatus);

OrderItemStatus.hasMany(OrderItem);
OrderItem.belongsTo(OrderItemStatus);


Subcategory.hasMany(Product);
Product.belongsTo(Subcategory);

Category.hasMany(Product)
Product.belongsTo(Category);

Category.hasMany(Variant)
Variant.belongsTo(Category)

Subcategory.hasMany(Variant)
Variant.belongsTo(Subcategory)

Product.hasMany(Variant)
Variant.belongsTo(Product)

Variant.hasMany(VariantImages);
VariantImages.belongsTo(Variant);

Image.hasMany(VariantImages);
VariantImages.belongsTo(Image);

Subcategory.hasMany(SubcategoryImages);
SubcategoryImages.belongsTo(Subcategory);

Image.hasMany(SubcategoryImages);
SubcategoryImages.belongsTo(Image);

Product.hasMany(ProductImages);
ProductImages.belongsTo(Product);

Image.hasMany(ProductImages);
ProductImages.belongsTo(Image);

Spesification.hasMany(SpesificationImages);
SpesificationImages.belongsTo(Spesification);

Image.hasMany(SpesificationImages);
SpesificationImages.belongsTo(Image);


Description.hasMany(Product, {foreignKey: 'description_id'})
Product.belongsTo(Description, {as: "desc1" , foreignKey: 'description_id'})

Description.hasMany(Subcategory, {foreignKey: 'description_id'})
Subcategory.belongsTo(Description, {as: "desc2" , foreignKey: 'description_id'})


Variant.hasMany(SpecialPrices)
SpecialPrices.belongsTo(Variant)

User.hasMany(SpecialPrices)
SpecialPrices.belongsTo(User)

// Claims
User.hasMany(Claim)
Claim.belongsTo(User)

// Variant audit log
Variant.hasMany(VariantAuditLog)
VariantAuditLog.belongsTo(Variant)
User.hasMany(VariantAuditLog)
VariantAuditLog.belongsTo(User)

Customer.hasMany(Transaction)
Transaction.belongsTo(Customer)

Customer.hasMany(Order)
Order.belongsTo(Customer);

Order.hasMany(Transaction)
Transaction.belongsTo(Order);

Variant.hasMany(Featured, {
  foreignKey: "source_id",
  as: "FPT"
});

Variant.hasMany(Featured, {
  foreignKey: "target_id",
  as: "featuredSources"
});

Featured.belongsTo(Variant, {
  foreignKey: "source_id",
  as: "source"
});

Featured.belongsTo(Variant, {
  foreignKey: "target_id",
  as: "target"
});

// Discount codes
DiscountCode.hasMany(DiscountCodeRedemption)
DiscountCodeRedemption.belongsTo(DiscountCode)
User.hasMany(DiscountCodeRedemption)
DiscountCodeRedemption.belongsTo(User)
// constraints: false - the live "order" table's id column has no PK/unique
// constraint at the DB level (a pre-existing condition, not something this
// association should try to fix), so a real FK to it fails at sync time.
// Every other order_id FK in this codebase is similarly DB-unenforced.
Order.hasOne(DiscountCodeRedemption, { constraints: false })
DiscountCodeRedemption.belongsTo(Order, { constraints: false })
DiscountCode.hasMany(Order)
Order.belongsTo(DiscountCode)

// Pricing audit log (SpecialPrices + discountPercent changes)
User.hasMany(PricingAuditLog, { as: 'pricingAuditLog', foreignKey: 'targetUserId' })
PricingAuditLog.belongsTo(User, { as: 'targetUser', foreignKey: 'targetUserId' })
User.hasMany(PricingAuditLog, { as: 'pricingAuditActions', foreignKey: 'actorUserId' })
PricingAuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actorUserId' })
Variant.hasMany(PricingAuditLog, { foreignKey: 'variantId' })
PricingAuditLog.belongsTo(Variant, { foreignKey: 'variantId' })


module.exports = {
		User,
		Product,
		Order,
		OrderStatus,
		OrderItem,
		OrderItemStatus,
		Shipment,
		ShipmentStatus,
		Customer,
		Carrier,
		CarrierPrice,
		Deci,
		Category,
		Subcategory,
		Description,
		Invoice,
		Cart,
		Cookie,
		Transaction,
		ProductImages,
		VariantImages,
		SubcategoryImages,
		SpesificationImages,
		Spesification,
		Variant,
		SpecialPrices,
		Dimensions,
		PackageInfo,
		PalletInfo,
		ShippingProfiles,
		Image,
		Price,
		Featured,
		Claim,
		Billing,
		VariantAuditLog,
		DiscountCode,
		DiscountCodeRedemption,
		PricingAuditLog
	};
