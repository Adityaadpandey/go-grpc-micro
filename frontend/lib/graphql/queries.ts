import { gql } from "@apollo/client";

export const GET_ACCOUNTS = gql`
  query GetAccounts($skip: Int, $take: Int, $id: String) {
    accounts(pagination: { skip: $skip, take: $take }, id: $id) {
      id
      name
      orders {
        id
        createdAt
        totalPrice
        products {
          id
          name
          quantity
          price
        }
      }
    }
  }
`;

export const GET_ACCOUNT_BY_ID = gql`
  query GetAccountById($id: String!) {
    accounts(id: $id) {
      id
      name
      orders {
        id
        createdAt
        totalPrice
        products {
          id
          name
          description
          price
          quantity
        }
      }
    }
  }
`;

export const GET_PRODUCTS = gql`
  query GetProducts($skip: Int, $take: Int, $query: String, $id: String) {
    products(
      pagination: { skip: $skip, take: $take }
      query: $query
      id: $id
    ) {
      id
      name
      description
      price
    }
  }
`;

// Raw GraphQL strings for server-side fetch (no Apollo)
export const ACCOUNTS_QUERY_STRING = `
  query GetAccounts($skip: Int, $take: Int) {
    accounts(pagination: { skip: $skip, take: $take }) {
      id
      name
      orders {
        id
        createdAt
        totalPrice
        products { id name price quantity }
      }
    }
  }
`;

export const PRODUCTS_QUERY_STRING = `
  query GetProducts($skip: Int, $take: Int, $query: String) {
    products(pagination: { skip: $skip, take: $take }, query: $query) {
      id
      name
      description
      price
    }
  }
`;

export const ACCOUNT_BY_ID_QUERY_STRING = `
  query GetAccountById($id: String!) {
    accounts(id: $id) {
      id
      name
      orders {
        id
        createdAt
        totalPrice
        products { id name description price quantity }
      }
    }
  }
`;
