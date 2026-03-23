# Sales API Fix: Item Discount Support

## Goal

Extend the sales API so each sale item can support a per-item discount at checkout.

Frontend needs to support:
- discount by fixed amount
- discount by percent
- no discount

Discount is applied per unit, then multiplied by item quantity.

## Current Problem

Current `POST /api/v1/stores/:storeID/sales` only accepts:

```json
{
  "payment_method": "cash",
  "paid_amount": 500,
  "note": "walk-in customer",
  "items": [
    {
      "product_id": "prod_coffee_001",
      "quantity": 2
    }
  ]
}
```

This is not enough for POS checkout because cashier may need to:
- reduce price for one line item
- choose discount as amount or percent
- show exact line total and bill total after discount

## Required Change

Add optional discount fields to each sale item in `POST /sales`.

## Updated Request Contract

### POST `/api/v1/stores/:storeID/sales`

```json
{
  "payment_method": "cash",
  "paid_amount": 500,
  "note": "walk-in customer",
  "items": [
    {
      "product_id": "prod_coffee_001",
      "quantity": 2,
      "discount_type": "amount",
      "discount_value": 10
    },
    {
      "product_id": "prod_bakery_002",
      "quantity": 1,
      "discount_type": "percent",
      "discount_value": 15
    },
    {
      "product_id": "prod_accessory_003",
      "quantity": 1
    }
  ]
}
```

## Item Discount Rules

### `discount_type`

Allowed values:
- `amount`
- `percent`

If omitted, treat as no discount.

### `discount_value`

Rules:
- required if `discount_type` is provided
- must be `>= 0`
- for `amount`: means discount amount per unit
- for `percent`: means percent per unit, range `0-100`

### Validation

Reject request if:
- `quantity < 1`
- `discount_type` is invalid
- `discount_value` is missing when `discount_type` exists
- `discount_value < 0`
- `discount_type = percent` and `discount_value > 100`
- `discount_type = amount` and `discount_value > unit_price`
- paid amount is less than final total amount
- product is inactive
- stock is insufficient

Return 400 with clear error message.

## Pricing Formula

Assume backend still uses the current product effective price at sale time.

For each item:

```text
unit_price = product.effective_price
```

If `discount_type = amount`:

```text
discount_amount_per_unit = discount_value
```

If `discount_type = percent`:

```text
discount_amount_per_unit = unit_price * (discount_value / 100)
```

Then:

```text
final_unit_price = max(unit_price - discount_amount_per_unit, 0)
line_subtotal = unit_price * quantity
line_discount_total = discount_amount_per_unit * quantity
line_total = final_unit_price * quantity
```

Bill totals:

```text
subtotal_amount = sum(line_subtotal)
discount_amount = sum(line_discount_total)
total_amount = sum(line_total)
change_amount = paid_amount - total_amount
```

## Required Response Shape

### Response from `POST /api/v1/stores/:storeID/sales`

Need enough fields for receipt rendering and audit.

```json
{
  "success": true,
  "message": "sale created",
  "data": {
    "id": "sale_001",
    "payment_method": "cash",
    "paid_amount": 500,
    "subtotal_amount": 255,
    "discount_amount": 35,
    "total_amount": 220,
    "change_amount": 280,
    "note": "walk-in customer",
    "created_at": "2026-03-22T10:30:00Z",
    "items": [
      {
        "id": "sale_item_001",
        "product_id": "prod_coffee_001",
        "product_name": "Coffee Mug",
        "quantity": 2,
        "unit_price": 120,
        "discount_type": "amount",
        "discount_value": 10,
        "discount_amount_per_unit": 10,
        "line_subtotal": 240,
        "line_discount_total": 20,
        "line_total": 220
      },
      {
        "id": "sale_item_002",
        "product_id": "prod_bakery_002",
        "product_name": "Cake Slice",
        "quantity": 1,
        "unit_price": 35,
        "discount_type": "percent",
        "discount_value": 42.8571,
        "discount_amount_per_unit": 15,
        "line_subtotal": 35,
        "line_discount_total": 15,
        "line_total": 20
      }
    ]
  }
}
```

## GET Sales APIs Must Also Return Discount Data

### GET `/api/v1/stores/:storeID/sales`

Each sale summary should include:
- `id`
- `payment_method`
- `paid_amount`
- `subtotal_amount`
- `discount_amount`
- `total_amount`
- `change_amount`
- `note`
- `created_at`

### GET `/api/v1/stores/:storeID/sales/:saleID`

Must include full `items` with:
- `product_id`
- `product_name`
- `quantity`
- `unit_price`
- `discount_type`
- `discount_value`
- `discount_amount_per_unit`
- `line_subtotal`
- `line_discount_total`
- `line_total`

## Suggested DB Fields

If sale items table does not already store discount data, add:
- `discount_type` nullable text
- `discount_value` nullable decimal
- `discount_amount_per_unit` decimal not null default 0
- `line_subtotal` decimal not null
- `line_discount_total` decimal not null default 0
- `line_total` decimal not null

If sales table does not already store aggregated totals, add:
- `subtotal_amount` decimal not null
- `discount_amount` decimal not null default 0
- `total_amount` decimal not null
- `change_amount` decimal not null

Important:
- persist sale-time prices and discounts
- do not recalculate old receipts from current product prices later

## Backend Behavior Requirements

When creating sale:
1. Load all requested products in one transaction.
2. Reject inactive or missing products.
3. Reject insufficient stock before writing sale.
4. Compute effective price from current product pricing rules.
5. Compute per-item discount and line totals.
6. Compute bill subtotal, total discount, final total, and change.
7. Reject if `paid_amount < total_amount`.
8. Insert sale record.
9. Insert sale item records with frozen price and discount snapshot.
10. Decrease `product.quantity`.
11. Commit transaction.

## Error Message Suggestions

Use clear messages such as:
- `product not found`
- `product is inactive`
- `insufficient stock for product <product_id>`
- `discount_type must be amount or percent`
- `discount_value is required when discount_type is provided`
- `percent discount must be between 0 and 100`
- `amount discount cannot exceed unit price`
- `paid amount is less than total amount`

## Frontend Assumptions After This Fix

Frontend will send per-item discount from checkout UI and expects backend totals to be the source of truth.

Frontend will use response values directly for:
- order summary
- receipt modal
- sales history

## Backward Compatibility

Keep old payloads working:
- if item has no `discount_type` and no `discount_value`, treat discount as zero

This allows frontend rollout without breaking existing clients.
