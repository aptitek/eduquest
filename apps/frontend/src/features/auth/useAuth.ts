import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../game/gameStore';
import { BACKEND_BASE_URL, ENABLE_DEV_TOOLS } from '../../config/deployment';
import { ApiClientError, throwApiResponseError } from '../errors/api';

export { BACKEND_BASE_URL };

export type AuthErrorCode = 'invalidSession' | 'loginUnavailable';

export type AuthControls = {
  error: AuthErrorCode | string | null;
  loginWithGithub: () => void;
  loginWithDevUser: (studentId?: string) => void;
  createMockGithubAccount: () => void;
};

function getCohortInviteToken() {
  return new URLSearchParams(window.location.search).get('cohortInvite');
}

export function useAuth() {
  const { user, student, character, setUserSession, logout: clearStoreSession } = useGameStore();
  const [loadingSession, setLoadingSession] = useState(() => {
    // Si l'utilisateur est déjà présent en mémoire, pas de chargement
    if (useGameStore.getState().user) return false;
    // Si on a un token dans l'URL ou en localStorage, on va devoir le vérifier
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const savedToken = localStorage.getItem('eduquest_token');
    return !!(tokenFromUrl || savedToken);
  });
  const [error, setError] = useState<string | null>(null);

  // Vérifie la validité du token local
  const verifySession = useCallback(
    async (token: string) => {
      setLoadingSession(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throwApiResponseError(response, data, 'Your session expired. Please sign in again.');
        }
        if (data.success && data.user && (data.user.isAdmin || data.student)) {
          if (typeof data.token === 'string' && data.token) {
            localStorage.setItem('eduquest_token', data.token);
          }
          setUserSession(data.user, data.student || null, data.character || null, data.activityCompletions || []);
        } else {
          throw new Error('Malformed server session payload');
        }
      } catch (err: unknown) {
        console.warn('Authentication validation failed:', err);
        localStorage.removeItem('eduquest_token');
        clearStoreSession();
        setError(getAuthErrorCode(err));
      } finally {
        setLoadingSession(false);
      }
    },
    [setUserSession, clearStoreSession]
  );

  // Initialisation et parsing URL
  useEffect(() => {
    // Si l'utilisateur est déjà connecté en mémoire, pas besoin de revérifier
    if (user) {
      setLoadingSession(false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const errorFromUrl = urlParams.get('error');

    if (errorFromUrl) {
      setError(errorFromUrl);
      setLoadingSession(false);
      // Clean query params to keep clean experience
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, document.title, url.pathname + url.search);
      return;
    }

    if (tokenFromUrl) {
      localStorage.setItem('eduquest_token', tokenFromUrl);

      // Clean query params to keep URLs clean
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.pathname + url.search);

      verifySession(tokenFromUrl);
    } else {
      const savedToken = localStorage.getItem('eduquest_token');
      if (savedToken) {
        verifySession(savedToken);
      } else {
        setLoadingSession(false);
      }
    }
  }, [verifySession, user]);

  // Déclencheurs de Redirection
  const loginWithGithub = useCallback(() => {
    const url = new URL(`${BACKEND_BASE_URL}/api/auth/github`);
    const cohortInvite = getCohortInviteToken();
    if (cohortInvite) url.searchParams.set('invite', cohortInvite);
    window.location.href = url.toString();
  }, []);

  const loginWithDevUser = useCallback((studentId?: string) => {
    if (!ENABLE_DEV_TOOLS) return;

    const url = new URL(`${BACKEND_BASE_URL}/api/auth/dev/login`);
    if (studentId) url.searchParams.set('studentId', studentId);
    const cohortInvite = getCohortInviteToken();
    if (cohortInvite) url.searchParams.set('invite', cohortInvite);
    window.location.href = url.toString();
  }, []);

  const createMockGithubAccount = useCallback(() => {
    if (!ENABLE_DEV_TOOLS) return;

    const url = new URL(`${BACKEND_BASE_URL}/api/auth/dev/mock-github`);
    const cohortInvite = getCohortInviteToken();
    if (cohortInvite) url.searchParams.set('invite', cohortInvite);
    window.location.href = url.toString();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('eduquest_token');
    clearStoreSession();
  }, [clearStoreSession]);

  return {
    user,
    student,
    character,
    loadingSession,
    error,
    loginWithGithub,
    loginWithDevUser,
    createMockGithubAccount,
    logout,
  };
}

function getAuthErrorCode(error: unknown): AuthErrorCode {
  if (error instanceof ApiClientError) {
    if (
      error.status >= 500 ||
      ['internal_error', 'network_error', 'server_configuration', 'service_unavailable'].includes(error.errorCode)
    ) {
      return 'loginUnavailable';
    }
  }

  if (error instanceof TypeError || error instanceof SyntaxError) {
    return 'loginUnavailable';
  }

  return 'invalidSession';
}
