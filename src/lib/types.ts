export interface Special {
  salefinderId: string;
  saleId: string;
  retailerId: number;
  productName: string;
  description: string;
  salePriceCents: number | null;
  originalPriceCents: number | null;
  savingsCents: number | null;
  multiBuyQty: number | null;
  multiBuyPriceCents: number | null;
  unitPriceText: string;
  memberPrice: boolean;
  buyUrl: string;
  categoryId: number;
  region: string;
}

export interface Category {
  id: number;
  name: string;
  path: string;
  parentName: string;
}

export const CATEGORIES: Category[] = [
  { id: 191, name: "Groceries", path: "/food-and-beverage/groceries/c-191", parentName: "Food & Beverage" },
  { id: 190, name: "Beverages", path: "/food-and-beverage/beverages/c-190", parentName: "Food & Beverage" },
  { id: 168, name: "Home Essentials", path: "/home-and-living/home-essentials/c-168", parentName: "Home & Living" },
  { id: 129, name: "Healthcare & Medications", path: "/health-and-beauty/healthcare-and-medications/c-129", parentName: "Health & Beauty" },
];
