export interface PaginationInput {
  skip?: number;
  take?: number;
}

export interface Account {
  id: string;
  name: string;
  orders: Order[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface Order {
  id: string;
  createdAt: string; // ISO timestamp (Time scalar)
  totalPrice: number;
  products: OrderedProduct[];
}

export interface OrderedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

// Query result shapes
export interface AccountsQueryResult {
  accounts: Account[];
}

export interface ProductsQueryResult {
  products: Product[];
}

// Mutation input types
export interface AccountInput {
  name: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
}

export interface OrderProductInput {
  id: string;
  quantity: number;
}

export interface OrderInput {
  accountId: string;
  products: OrderProductInput[];
}

// Mutation result shapes
export interface CreateAccountMutationResult {
  createAccount: Account | null;
}

export interface CreateProductMutationResult {
  createProduct: Product | null;
}

export interface CreateOrderMutationResult {
  createOrder: Order | null;
}
