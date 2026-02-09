/**
 * Authenticated fetch: adds Bearer token, on 401 tries refresh and retry,
 * then on failure calls notifySessionExpired() (modal + redirect).
 */
import { API_BASE_URL } from '@/config/api';
import { authAPI } from './auth';

function isApiUrl(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url.startsWith(API_BASE_URL);
}

function normalizeRequest(input: RequestInfo | URL, init?: RequestInit): { url: string; init: RequestInit } {
  if (typeof input === 'string') {
    return { url: input, init: init ?? {} };
  }
  if (input instanceof URL) {
    return { url: input.href, init: init ?? {} };
  }
  const req = input as Request;
  return {
    url: req.url,
    init: {
      method: req.method,
      headers: req.headers,
      body: req.body,
      credentials: req.credentials,
      cache: req.cache,
      redirect: req.redirect,
      referrer: req.referrer,
      integrity: req.integrity,
      ...init,
    },
  };
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const { url, init: normalizedInit } = normalizeRequest(input, init);
  if (!isApiUrl(url)) {
    return fetch(input, init);
  }

  let token = authAPI.getToken();
  const headers = new Headers(normalizedInit.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, { ...normalizedInit, headers });

  if (response.status === 401) {
    const refreshResult = await authAPI.refresh();
    if (refreshResult.token) {
      headers.set('Authorization', `Bearer ${refreshResult.token}`);
      response = await fetch(url, { ...normalizedInit, headers });
    }
    if (response.status === 401) {
      authAPI.notifySessionExpired();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  return response;
}
