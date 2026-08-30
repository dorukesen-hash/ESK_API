const XLSX = require("xlsx");
const { Variant, Category, Subcategory, Product } = require("../db/models");
const { VARIANT_EXCEL_COLUMNS } = require("./variantExcelColumns");
const { logVariantFieldChanges, logVariantCreate } = require("./variantAuditController");

const exportVariantsExcel = async () => {
  const variants = await Variant.findAll({
    include: [
      { model: Category, attributes: ["name"] },
      { model: Subcategory, attributes: ["name"] },
      { model: Product, attributes: ["title"] },
    ],
    order: [["id", "ASC"]],
  });

  const rows = variants.map((v) => {
    const row = {
      ID: v.id,
      Category: v.category?.name ?? "",
      Subcategory: v.subcategory?.name ?? "",
      Product: v.product?.title ?? "",
    };
    for (const column of VARIANT_EXCEL_COLUMNS) {
      row[column.header] = v[column.field] ?? "";
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Variants");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const parseBoolean = (raw) => {
  if (raw === null || raw === undefined || raw === "") return false;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};

// Returns { present, value, invalid }. present:false means "blank cell" -
// callers treat that as "leave unchanged" on update, or a plain default on
// create. invalid:true means the cell had a non-numeric value in a number
// column - the caller reports the row as failed rather than guessing.
const parseCellValue = (raw, column) => {
  if (raw === null || raw === undefined || raw === "") return { present: false, value: null };
  if (column.type === "boolean") return { present: true, value: parseBoolean(raw) };
  if (column.type === "number") {
    const num = Number(raw);
    if (Number.isNaN(num)) return { present: false, value: null, invalid: true };
    return { present: true, value: column.decimal ? num : Math.round(num) };
  }
  return { present: true, value: String(raw) };
};

const findByName = (list, name, key) =>
  list.find((item) => (item[key] || "").trim().toLowerCase() === String(name).trim().toLowerCase());

// Every row is attempted independently - one bad row goes to `failed`, the
// rest still process (unlike uploadVariantExcel's create-only path, which
// throws and stops on the first bad row).
const bulkImportVariantsExcel = async (fileBuffer, userId) => {
  const workbook = XLSX.read(fileBuffer.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  const result = { created: 0, updated: 0, failed: [] };

  const [categories, subcategories, products] = await Promise.all([
    Category.findAll(),
    Subcategory.findAll(),
    Product.findAll(),
  ]);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // header is row 1
    const stockLabel = row["Stock #"] || row["Title"] || `row ${rowNumber}`;

    try {
      const id = row["ID"] ? parseInt(row["ID"]) : null;

      if (id) {
        const existing = await Variant.findByPk(id);
        if (!existing) {
          result.failed.push({ row: rowNumber, stock: stockLabel, reason: `Variant ID ${id} not found` });
          continue;
        }

        const changedFields = {};
        let invalidColumn = null;
        for (const column of VARIANT_EXCEL_COLUMNS) {
          const parsed = parseCellValue(row[column.header], column);
          if (parsed.invalid) {
            invalidColumn = column.header;
            break;
          }
          if (!parsed.present) continue; // blank cell = leave unchanged
          changedFields[column.field] = parsed.value;
        }
        if (invalidColumn) {
          result.failed.push({ row: rowNumber, stock: stockLabel, reason: `Invalid value for "${invalidColumn}"` });
          continue;
        }

        const loggedCount = await logVariantFieldChanges(id, userId, existing, changedFields);
        if (loggedCount > 0) {
          await Variant.update(changedFields, { where: { id } });
          result.updated += 1;
        }
      } else {
        const variantData = {};
        let invalidColumn = null;
        for (const column of VARIANT_EXCEL_COLUMNS) {
          const parsed = parseCellValue(row[column.header], column);
          if (parsed.invalid) {
            invalidColumn = column.header;
            break;
          }
          variantData[column.field] = parsed.value;
        }
        if (invalidColumn) {
          result.failed.push({ row: rowNumber, stock: stockLabel, reason: `Invalid value for "${invalidColumn}"` });
          continue;
        }

        if (!variantData.stock || !variantData.title) {
          result.failed.push({
            row: rowNumber,
            stock: stockLabel,
            reason: "Title and Stock # are required to create a variant",
          });
          continue;
        }

        const categoryName = row["Category"];
        const subcategoryName = row["Subcategory"];
        const productName = row["Product"];

        if (productName) {
          const product = findByName(products, productName, "title");
          if (!product) {
            result.failed.push({ row: rowNumber, stock: stockLabel, reason: `Product "${productName}" not found` });
            continue;
          }
          variantData.productId = product.id;
          variantData.subcategoryId = product.subcategoryId;
          variantData.categoryId = product.categoryId;
        } else if (subcategoryName) {
          const subcategory = findByName(subcategories, subcategoryName, "name");
          if (!subcategory) {
            result.failed.push({
              row: rowNumber,
              stock: stockLabel,
              reason: `Subcategory "${subcategoryName}" not found`,
            });
            continue;
          }
          variantData.subcategoryId = subcategory.id;
          variantData.categoryId = subcategory.categoryId;
        } else if (categoryName) {
          const category = findByName(categories, categoryName, "name");
          if (!category) {
            result.failed.push({ row: rowNumber, stock: stockLabel, reason: `Category "${categoryName}" not found` });
            continue;
          }
          variantData.categoryId = category.id;
        } else {
          result.failed.push({
            row: rowNumber,
            stock: stockLabel,
            reason: "New variant rows need a Category, Subcategory, or Product",
          });
          continue;
        }

        const created = await Variant.create(variantData);
        await logVariantCreate(created.id, userId, created);
        result.created += 1;
      }
    } catch (error) {
      result.failed.push({ row: rowNumber, stock: stockLabel, reason: error.message || "Unknown error" });
    }
  }

  return result;
};

module.exports = { exportVariantsExcel, bulkImportVariantsExcel };
