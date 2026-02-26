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

import { Observable } from "@apollo/client";

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
};

const clearPendingRequests = () => {
  pendingRequests = [];
};

const refreshToken = async () => {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Refresh failed");
    return true;
  } catch {
    return false;
  }
};

/** Log GraphQL errors and handle token refresh */
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }: any) => {
  if (process.env.NODE_ENV === "development") {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message }: { message: string }) => {
        console.error(`[GraphQL Error] ${message}`);
      });
    }
    if (networkError) console.error("[Network Error]", networkError);
  }

  const isUnauthorizedError =
    (graphQLErrors &&
      graphQLErrors.some(
        (e: { message?: string }) =>
          e.message?.includes("401") ||
          e.message?.toLowerCase().includes("unauthorized") ||
          e.message?.toLowerCase().includes("authentication required")
      )) ||
    (networkError && "statusCode" in networkError && (networkError as { statusCode?: number }).statusCode === 401);

  if (isUnauthorizedError) {
    if (!isRefreshing) {
      isRefreshing = true;
      return new Observable((observer) => {
        refreshToken()
          .then((success) => {
            isRefreshing = false;
            if (success) {
              resolvePendingRequests();
            } else {
              clearPendingRequests();
              // Optional: force logout redirect here if desired
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
            }
            return success;
          })
          .then((success) => {
            if (!success) {
              return observer.error(new Error("Token refresh failed"));
            }
            // Retry the failed operation
            const oldHeaders = operation.getContext().headers || {};
            operation.setContext({
              headers: {
                ...oldHeaders,
                "X-CSRF-Token": getCSRFToken(), // get new CSRF token
              },
            });

            // Forward the operation and subscribe to stream results back
            const subscriber = {
              next: observer.next.bind(observer),
              error: observer.error.bind(observer),
              complete: observer.complete.bind(observer),
            };
            forward(operation).subscribe(subscriber);
          })
          .catch((err) => {
            isRefreshing = false;
            clearPendingRequests();
            observer.error(err);
          });
      });
    } else {
      // If already refreshing, wait for it to finish then retry
      return new Observable((observer) => {
        pendingRequests.push(() => {
          const oldHeaders = operation.getContext().headers || {};
          operation.setContext({
            headers: {
              ...oldHeaders,
              "X-CSRF-Token": getCSRFToken(),
            },
          });
          forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        });
      });
    }
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
