export const IMPERSONATOR_TOKEN_STORAGE_KEY = 'eduquest_impersonator_token';
export const IMPERSONATED_TOKEN_STORAGE_KEY = 'eduquest_token';

export function startImpersonationSession(token: string) {
  const currentToken = localStorage.getItem(IMPERSONATED_TOKEN_STORAGE_KEY);
  if (currentToken && !localStorage.getItem(IMPERSONATOR_TOKEN_STORAGE_KEY)) {
    localStorage.setItem(IMPERSONATOR_TOKEN_STORAGE_KEY, currentToken);
  }

  localStorage.setItem(IMPERSONATED_TOKEN_STORAGE_KEY, token);
  window.location.hash = 'map';
  window.location.reload();
}

export function stopImpersonationSession() {
  const impersonatorToken = localStorage.getItem(IMPERSONATOR_TOKEN_STORAGE_KEY);
  if (!impersonatorToken) return false;

  localStorage.setItem(IMPERSONATED_TOKEN_STORAGE_KEY, impersonatorToken);
  localStorage.removeItem(IMPERSONATOR_TOKEN_STORAGE_KEY);
  window.location.hash = 'management';
  window.location.reload();
  return true;
}

export function hasImpersonationSession() {
  return Boolean(localStorage.getItem(IMPERSONATOR_TOKEN_STORAGE_KEY));
}
