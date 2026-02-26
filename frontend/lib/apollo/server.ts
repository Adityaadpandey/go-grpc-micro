/**
 * Server-side GraphQL client.
 * Used in Server Components and API routes to talk directly
 * to the GraphQL backend (server-to-server, no proxy needed).
 */

const GRAPHQL_URL =
  process.env.GRAPHQL_URL ?? "http://localhost:8000/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

/**
 * Execute a GraphQL operation from the server.
 * Errors are masked – only a safe message is surfaced.
 */
export async function serverGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      // No caching – GraphQL responses are dynamic
      cache: "no-store",
    });
  } catch (cause) {
    throw new Error("Service temporarily unavailable", { cause });
  }

  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    // Log the real error server-side but only surface a safe message
    if (process.env.NODE_ENV === "development") {
      console.error("[serverGraphQL errors]", json.errors);
    }
    throw new Error(json.errors[0].message ?? "GraphQL operation failed");
  }

  if (!json.data) {
    throw new Error("Empty response from service");
  }

  return json.data;
}
