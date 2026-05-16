export interface SubCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  subcategories: SubCategory[];
}
