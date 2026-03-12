import { GraphQLClient } from 'graphql-request';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

export const gqlClient = new GraphQLClient(API_URL, {
  credentials: 'include',
});

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  sessionId?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  const client = new GraphQLClient(API_URL, {
    credentials: 'include',
    headers,
  });

  try {
    const data = await client.request<T>(query, variables);
    return data;
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw error;
  }
}

export const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost:4000';
