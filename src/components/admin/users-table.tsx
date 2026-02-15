'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChangeTierModal } from './change-tier-modal';
import { DisableAccountModal } from './disable-account-modal';

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

interface UsersTableProps {
  users: User[];
  pagination: Pagination | null;
  loading?: boolean;
  onActionComplete?: () => void;
}

export function UsersTable({ users, pagination, loading, onActionComplete }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  function copyToClipboard(text: string, userId: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  function formatName(user: User) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || '-';
  }

  function getTierBadgeVariant(tier: string) {
    switch (tier) {
      case 'elite':
        return 'default'; // Purple
      case 'pro':
        return 'secondary'; // Blue
      case 'core':
        return 'outline'; // Gray
      case 'free':
      default:
        return 'outline';
    }
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30';
      case 'trialing':
        return 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30';
      case 'canceled':
        return 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30';
      case 'past_due':
        return 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-yellow-500/30';
      case 'inactive':
      default:
        return 'bg-surface text-text-secondary hover:bg-surface/80 border-border';
    }
  }

  async function handleToggleBeta(user: User) {
    setIsUpdating(user.id);
    try {
      const response = await fetch('/api/admin/users/toggle-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isBeta: !user.isBeta }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update beta status');
      }

      onActionComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update beta status';
      alert(message);
    } finally {
      setIsUpdating(null);
    }
  }

  function openTierModal(user: User) {
    setSelectedUser(user);
    setIsTierModalOpen(true);
  }

  function openDisableModal(user: User) {
    setSelectedUser(user);
    setIsDisableModalOpen(true);
  }

  function goToNextPage() {
    if (!pagination?.hasMore || !pagination?.lastEvaluatedKey) return;

    const params = new URLSearchParams(searchParams);
    params.set('lastEvaluatedKey', pagination.lastEvaluatedKey);
    router.push(`/admin/users?${params.toString()}`);
  }

  function goToPreviousPage() {
    // For DynamoDB, we can't easily go backwards
    // Use browser history instead
    router.back();
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-text-primary">Email</TableHead>
              <TableHead className="text-text-primary">Name</TableHead>
              <TableHead className="text-text-primary">Tier</TableHead>
              <TableHead className="text-text-primary">Status</TableHead>
              <TableHead className="text-text-primary">Beta</TableHead>
              <TableHead className="text-text-primary">Signed Up</TableHead>
              <TableHead className="text-text-primary">Workouts</TableHead>
              <TableHead className="text-right text-text-primary">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-[200px] text-text-primary">{user.email}</span>
                      {user.isAdmin && (
                        <Badge variant="destructive" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-primary">{formatName(user)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getTierBadgeVariant(user.subscriptionTier)}
                      className="capitalize"
                    >
                      {user.subscriptionTier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={`capitalize ${getStatusBadgeColor(user.subscriptionStatus)}`}
                      >
                        {user.subscriptionStatus}
                      </Badge>
                      {user.isDisabled && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isBeta ? (
                      <Badge variant="secondary">Beta</Badge>
                    ) : (
                      <span className="text-sm text-text-secondary">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-text-primary">{user.workoutsSaved}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => copyToClipboard(user.id, user.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copiedId === user.id ? 'Copied!' : 'Copy User ID'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copyToClipboard(user.email, `email-${user.id}`)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copiedId === `email-${user.id}` ? 'Copied!' : 'Copy Email'}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${user.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleBeta(user)}
                          disabled={isUpdating === user.id}
                        >
                          {user.isBeta ? 'Remove Beta Flag' : 'Mark as Beta'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openTierModal(user)}>
                          Change Tier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={user.isDisabled ? '' : 'text-red-600'}
                          onClick={() => openDisableModal(user)}
                        >
                          {user.isDisabled ? 'Enable Account' : 'Disable Account'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // This would open a details modal
                            alert(`User Details:\n\n${JSON.stringify(user, null, 2)}`);
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination && users.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
            {pagination.hasMore && ' (more available)'}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={!searchParams.get('lastEvaluatedKey') || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={!pagination.hasMore || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <ChangeTierModal
        open={isTierModalOpen}
        user={selectedUser}
        onOpenChange={setIsTierModalOpen}
        onUpdated={onActionComplete}
      />
      <DisableAccountModal
        open={isDisableModalOpen}
        user={selectedUser}
        onOpenChange={setIsDisableModalOpen}
        onUpdated={onActionComplete}
      />
    </div>
  );
}
