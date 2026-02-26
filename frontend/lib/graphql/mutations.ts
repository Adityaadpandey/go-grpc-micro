import { gql } from "@apollo/client";

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount($name: String!) {
    createAccount(account: { name: $name }) {
      id
      name
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct(
    $name: String!
    $description: String!
    $price: Float!
  ) {
    createProduct(
      product: { name: $name, description: $description, price: $price }
    ) {
      id
      name
      description
      price
    }
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($accountId: String!, $products: [OrderProductInput!]!) {
    createOrder(order: { accountId: $accountId, products: $products }) {
      id
      createdAt
      totalPrice
      products {
        id
        name
        price
        quantity
      }
    }
  }
`;

// Raw strings for server-side use
export const CREATE_ACCOUNT_MUTATION = `
  mutation CreateAccount($name: String!) {
    createAccount(account: { name: $name }) {
      id
      name
    }
  }
`;
