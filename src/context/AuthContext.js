import React, { createContext, useState, useEffect, useCallback } from 'react';
import {jwtDecode} from 'jwt-decode'; // Ensure correct import
import axios from 'axios';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    email: localStorage.getItem('email'),
    name: localStorage.getItem('name')
  });

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    setAuthState({
      accessToken: null,
      refreshToken: null,
      email: null,
      name: null
    });
  }, [setAuthState]);

  useEffect(() => {
    if (authState.accessToken) {
      const decodedToken = jwtDecode(authState.accessToken);
      setAuthState((prevState) => ({
        ...prevState,
        email: decodedToken.sub,
      }));
    }
  }, [authState.accessToken]);

  const setTokens = useCallback((accessToken, refreshToken, email, name) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('email', email);
    localStorage.setItem('name', name);
    setAuthState(prevState => ({
      ...prevState,
      accessToken,
      refreshToken,
      email,
      name,
    }));
  }, [setAuthState]);

  const refreshToken = useCallback(async () => {
    try {
      const response = await axios.post('/auth/refresh', { refreshToken: authState.refreshToken });
      const { token: accessToken, refreshToken: newRefreshToken, email, name } = response.data;
      setTokens(accessToken, newRefreshToken, email, name);
    } catch (error) {
      console.error('Failed to refresh token', error);
      logout();
    }
  }, [authState.refreshToken, setTokens, logout]);

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (authState.accessToken) {
        const { exp } = jwtDecode(authState.accessToken);
        const now = Date.now() / 1000;
        if (exp < now) {
          refreshToken();
        } else {
          setTimeout(() => {
            refreshToken();
          }, (exp - now - 60) * 1000); // Refresh 1 minute before expiration
        }
      }
    };
    checkTokenExpiration();
  }, [authState.accessToken, refreshToken]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('token');
    const refreshToken = params.get('refreshToken');
    const email = params.get('email');
    const name = params.get('name');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken, email, name);
      window.history.replaceState({}, document.title, "/"); // Remove tokens from URL
    }
  }, [setTokens]);

  return (
    <AuthContext.Provider value={{ authState, setTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };