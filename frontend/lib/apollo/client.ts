"use client";

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

/** Read CSRF token from cookie (client-side only). */
function getCSRFToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const httpLink = createHttpLink({
  // Route through our secure Next.js proxy (never expose backend URL to browser)
  uri: "/api/graphql",
  credentials: "same-origin",
});

/** Attach CSRF header to every request */
const csrfLink = setContext((_, previousContext: Record<string, unknown>) => {
  const headers = (previousContext.headers as Record<string, string> | undefined) ?? {};
  return {
    headers: {
      ...headers,
      "X-CSRF-Token": getCSRFToken(),
      "X-Requested-With": "XMLHttpRequest",
    },
  };
});

/** Log GraphQL errors (dev only, masked in production) */
const errorLink = onError((errorHandler) => {
  if (process.env.NODE_ENV === "development") {
    const { operation, response } = errorHandler as {
      operation?: unknown;
      response?: { errors?: Array<{ message: string }> };
      networkError?: Error;
    };
    void operation;
    if (response?.errors) {
      response.errors.forEach(({ message }) => {
        console.error(`[GraphQL Error] ${message}`);
      });
    }
    const ne = (errorHandler as { networkError?: Error }).networkError;
    if (ne) console.error("[Network Error]", ne);
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, csrfLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Account: { keyFields: ["id"] },
      Product: { keyFields: ["id"] },
      Order: { keyFields: ["id"] },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    },
    query: {
      fetchPolicy: "network-only",
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
});
