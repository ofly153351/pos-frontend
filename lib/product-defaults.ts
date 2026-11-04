// B17: safe defaults for a new product. Optional brand/category start empty;
// the unit is preselected only when it is unambiguous (the store has exactly
// one active unit). There is no store-level default unit setting, so never
// pick "the first option" on the user's behalf.
export function newProductDefaults(units: { id: string; is_active?: boolean }[]) {
  const active = units.filter((u) => u.is_active !== false);
  return { brand_id: "", product_type_id: "", unit_id: active.length === 1 ? active[0].id : "" };
}
