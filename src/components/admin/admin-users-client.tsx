'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserFilters } from './user-filters';
import { UsersTable } from './users-table';

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  hasStripeSubscription?: boolean;
  createdAt: string;
  isAdmin: boolean;
  roles: string[];
  isBeta?: boolean;
  isDisabled?: boolean;
  disabledReason?: string | null;
  quotas: {
    scan: { used: number; limit: number | null; resetDate?: string | null };
    ocr: { used: number; limit: number | null; resetDate?: string | null };
    ai: { used: number; limit: number | null; resetDate?: string | null };
    instagram: { used: number; limit: number | null; resetDate?: string | null };
  };
  costs: {
    currentMonth: number;
    total: number;
  };
  workoutsSaved: number;
  onboardingCompleted: boolean;
}

interface Pagination {
  total: number;
  limit: number;
  hasMore: boolean;
  lastEvaluatedKey?: string;
}

export function AdminUsersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString = searchParams.toString();
      const response = await fetch(
        `/api/admin/users${queryString ? `?${queryString}` : ''}`,
        {
          credentials: 'include', // Include cookies for auth
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('[Admin Users] Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Fetch users whenever search params change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleRetry() {
    fetchUsers();
  }

  if (error) {
    return (
      <div className="mt-6">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-destructive mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Failed to Load Users
          </h3>
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-destructive hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <UserFilters />

      <div className="relative mt-6">
        {loading && (
          <div className="absolute inset-0 bg-surface/90 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading users...</p>
            </div>
          </div>
        )}

        {users.length === 0 && !loading ? (
          <div className="text-center p-12 bg-surface rounded-lg border border-border">
            <svg
              className="mx-auto h-12 w-12 text-text-secondary mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No Users Found
            </h3>
            <p className="text-text-secondary mb-4">
              No users match your current filters.
            </p>
            <button
              onClick={() => router.push('/admin/users')}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <UsersTable
            users={users}
            pagination={pagination}
            loading={loading}
            onActionComplete={fetchUsers}
          />
        )}
      </div>
    </>
  );
}
