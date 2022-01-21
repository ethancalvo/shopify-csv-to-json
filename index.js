#!/usr/bin/env node

if (process.argv.length < 4) {
  console.error(new Error("need an output document"));
  return;
}

const fileOutput = process.argv[3];

const filePath = process.argv[2];
const fs = require("fs");
const path = require("path");

function checkFileExists(fp) {
  if (fs.existsSync(fp)) {
    return true;
  }
  throw new Error(`whoa! ${fp} doesn't exist`);
}

let fl = path.resolve(process.cwd(), filePath);

try {
  checkFileExists(fl);
} catch (e) {
  console.error(e);
  return;
}

function createKeyName(title) {
  title = title
    .replace(/[^a-zA-Z0-9_\s]+/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
  return title;
}

const headerMap = [];
/**
 *
 * @param {Array<string>} row
 */
function createHeaderMap(headerRow) {
  headerRow.forEach((cell) => {
    headerMap.push(createKeyName(cell));
  });
}

const records = [];
const products = [];

/**
 * Product class receives an record Object and creates a new product
 * @constructor
 * @returns {Product}
 */
class Product {
  constructor(recObj) {
    const prodFields = [
      "handle",
      "title",
      "body_html",
      "vendor",
      "standard_product_type",
      "custom_product_type",
      "tags",
      "published",
      "seo_title",
      "seo_description",
      "google_shopping_google_product_category",
      "google_shopping_gender",
      "google_shopping_age_group",
      "google_shopping_mpn",
      "google_shopping_adwords_grouping",
      "google_shopping_adwords_labels",
      "google_shopping_condition",
      "google_shopping_custom_product",
      "google_shopping_custom_label_0",
      "google_shopping_custom_label_1",
      "google_shopping_custom_label_2",
      "google_shopping_custom_label_3",
      "google_shopping_custom_label_4",
      "status",
    ];
    let THIS = this;
    prodFields.forEach((fld) => {
      THIS[fld] = recObj[fld];
    });
    this.variants = [];
    this.options = {
      option1: { name: null, values: [] },
      option2: { name: null, values: [] },
      option3: { name: null, values: [] },
    };
    this.images = [];
    this.addVariant(recObj);
    this.addImage(recObj);
    this.addOption(recObj);
  }

  addVariant(recObj) {
    if (!recObj.variant_sku) {
      return;
    }
    const varFields = [
      "option1_name",
      "option1_value",
      "option2_name",
      "option2_value",
      "option3_name",
      "option3_value",
      "variant_sku",
      "variant_grams",
      "variant_inventory_tracker",
      "variant_inventory_qty",
      "variant_inventory_policy",
      "variant_fulfillment_service",
      "variant_price",
      "variant_compare_at_price",
      "variant_requires_shipping",
      "variant_taxable",
      "variant_barcode",
      "image_alt_text",
      "gift_card",
      "variant_image",
      "variant_weight_unit",
      "variant_tax_code",
      "cost_per_item",
      "status",
    ];

    let varObj = {};
    varFields.forEach((fld) => {
      varObj[fld] = recObj[fld];
    });
    this.variants.push(varObj);
  }

  addImage(recObj) {
    const imgFields = ["image_src", "image_position", "image_alt_text"];
    if (!recObj.image_src) {
      return;
    }
    let imgObj = {};
    imgFields.forEach((fld) => {
      imgObj[fld] = recObj[fld];
    });
    this.images.push(imgObj);
  }

  addOption(recObj) {
    if (!recObj.variant_sku) {
      return;
    }
    const optKeys = ["option1_name", "option2_name", "option3_name"];
    const optVals = ["option1_value", "option2_value", "option3_value"];
    let THIS = this;
    optKeys.forEach((optKey, idx) => {
      if (recObj[optKey] != "") {
        THIS.options[`option${idx + 1}`].name = recObj[optKey];
      }
    });
    optVals.forEach((optVal, idx) => {
      let optionArray = THIS.options[`option${idx + 1}`].values;

      if (
        optionArray.length == 0 ||
        optionArray.indexOf(recObj[optVal]) == -1
      ) {
        THIS.options[`option${idx + 1}`].values.push(recObj[optVal]);
      }
    });
  }

  data() {
    let dataObj = {};
    return this;
  }
}

function processRecord(record) {
  records.push(record);
  function isNewProduct(handle) {
    if (handle in products) {
      return false;
    } else {
      return true;
    }
  }
  let recObj = {};
  record.forEach((cell, i) => {
    recObj[headerMap[i]] = cell;
  });

  if (isNewProduct(recObj.handle)) {
    products[recObj.handle] = new Product(recObj);
  } else {
    products[recObj.handle].addVariant(recObj);
    products[recObj.handle].addImage(recObj);
    products[recObj.handle].addOption(recObj);
  }
}

const { parse } = require("csv-parse");

const parser = parse({
  delimiter: ",",
});

parser.on("readable", function () {
  let record;
  while ((record = parser.read()) !== null) {
    if (headerMap.length == 0) {
      createHeaderMap(record);
    } else {
      processRecord(record);
    }
  }
});

parser.on("error", function (err) {
  console.error(err.message);
});

parser.on("end", function () {
  let op = path.resolve(process.cwd(), fileOutput);
  fs.writeFileSync(op, "[", "utf8");
  for (key in products) {
    fs.appendFileSync(op, JSON.stringify(products[key].data()) + ",", "utf8");
  }
  fs.appendFileSync(op, "]", "utf8");
});

parser.write(fs.readFileSync(fl));
parser.end();
