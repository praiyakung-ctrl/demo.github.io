import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts logged out', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('login succeeds with valid credentials and persists to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = false;
    act(() => {
      ok = result.current.login('admin', 'admin1234');
    });
    expect(ok).toBe(true);
    expect(result.current.user?.role).toBe('admin');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canEdit).toBe(true);
    expect(JSON.parse(localStorage.getItem('auth_user')!).username).toBe('admin');
  });

  it('login fails with a wrong password', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    act(() => {
      ok = result.current.login('admin', 'wrong-password');
    });
    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('restores the session from localStorage', () => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({ id: 'u1', name: 'Test', username: 'operator', role: 'operator', email: 'x@x', isActive: true })
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.username).toBe('operator');
    expect(result.current.isOperator).toBe(true);
  });

  it('loginAsGoogle creates a citizen session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.loginAsGoogle();
    });
    expect(result.current.user?.role).toBe('citizen');
    expect(result.current.isCitizen).toBe(true);
    expect(result.current.canEdit).toBe(false);
  });

  it('logout clears the user and localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login('admin', 'admin1234');
    });
    act(() => {
      result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
