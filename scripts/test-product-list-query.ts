import { buildListProductsQuery } from "../services/products";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const outOfStock = buildListProductsQuery({
  limit: 9999,
  page: 1,
  sort_by: "created_at",
  stock_status: "out_of_stock",
});
check("out-of-stock query sends stock_status", outOfStock.get("stock_status") === "out_of_stock");
check("out-of-stock query preserves pagination", outOfStock.get("limit") === "9999" && outOfStock.get("page") === "1");

const allProducts = buildListProductsQuery({ limit: 9999, page: 1 });
check("all-products query does not send a status filter", allProducts.has("stock_status") === false);

const unboundedProducts = buildListProductsQuery({ limit: null, page: 1 });
check("all-products query requests an unbounded result", unboundedProducts.get("all") === "true");
check("all-products query omits artificial limit", unboundedProducts.has("limit") === false);

console.log(`RESULT ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);