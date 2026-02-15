import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers, type DynamoDBUser } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDb } from '@/lib/dynamodb';
import { writeAuditLog } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/request-ip';
import { getQuotaLimit, normalizeSubscriptionTier } from '@/lib/subscription-tiers';

export const runtime = 'nodejs';

interface ScanFilters {
  search?: string;
  tier?: 'free' | 'core' | 'pro' | 'elite';
  status?: 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due';
  dateFrom?: string;
  dateTo?: string;
  isAdmin?: boolean;
  isBeta?: boolean;
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // 2. Authorization check - verify admin permission
    const adminUser = await dynamoDBUsers.get(userId);
    if (!adminUser || !hasPermission(adminUser, 'admin:view-analytics')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required', success: false },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const filters = parseFilters(searchParams);

    // 4. Scan DynamoDB with filters
    const result = await scanUsersWithFilters(filters);

    // 5. Sanitize user data (remove sensitive fields)
    const sanitizedUsers = result.users.map(sanitizeUserForAdmin);

    // 6. Audit log
    await writeAuditLog({
      action: 'admin.view-users',
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      ipAddress: getRequestIp(req.headers),
      metadata: {
        filters: {
          search: filters.search,
          tier: filters.tier,
          status: filters.status,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          isAdmin: filters.isAdmin,
          isBeta: filters.isBeta,
        },
        resultCount: result.users.length,
      },
    });

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          total: result.count,
          limit: filters.limit || 50,
          hasMore: result.hasMore,
          lastEvaluatedKey: result.lastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
            : undefined,
        },
      },
    });
  } catch (error) {
    console.error('[Admin API] Error fetching users:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Parse and validate query parameters
 */
function parseFilters(searchParams: URLSearchParams): ScanFilters {
  const filters: ScanFilters = {};

  // Search by email (partial match)
  const search = searchParams.get('search');
  if (search && search.trim()) {
    filters.search = search.trim().toLowerCase();
  }

  // Filter by subscription tier
  const tier = searchParams.get('tier');
  if (tier && ['free', 'core', 'pro', 'elite'].includes(tier)) {
    filters.tier = tier as ScanFilters['tier'];
  }

  // Filter by subscription status
  const status = searchParams.get('status');
  if (
    status &&
    ['active', 'inactive', 'trialing', 'canceled', 'past_due'].includes(status)
  ) {
    filters.status = status as ScanFilters['status'];
  }

  // Filter by date range
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  // Filter admin users
  const isAdminParam = searchParams.get('isAdmin');
  if (isAdminParam === 'true') {
    filters.isAdmin = true;
  } else if (isAdminParam === 'false') {
    filters.isAdmin = false;
  }

  // Filter beta users (include missing isBeta when false)
  const isBetaParam = searchParams.get('isBeta');
  if (isBetaParam === 'true') {
    filters.isBeta = true;
  } else if (isBetaParam === 'false') {
    filters.isBeta = false;
  }

  // Pagination
  const limit = parseInt(searchParams.get('limit') || '50');
  filters.limit = Math.min(Math.max(limit, 1), 100); // Between 1-100

  // Pagination token (base64 encoded)
  const lastKey = searchParams.get('lastEvaluatedKey');
  if (lastKey) {
    try {
      filters.lastEvaluatedKey = JSON.parse(
        Buffer.from(lastKey, 'base64').toString()
      );
    } catch (error) {
      console.error('[Admin API] Invalid lastEvaluatedKey:', error);
    }
  }

  return filters;
}

/**
 * Scan DynamoDB users table with filters
 */
async function scanUsersWithFilters(filters: ScanFilters): Promise<{
  users: DynamoDBUser[];
  count: number;
  hasMore: boolean;
  lastEvaluatedKey?: Record<string, any>;
}> {
  const filterExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};
  const expressionAttributeNames: Record<string, string> = {};

  // Build filter expression
  if (filters.search) {
    filterExpressions.push('contains(#email, :search)');
    expressionAttributeNames['#email'] = 'email';
    expressionAttributeValues[':search'] = filters.search;
  }

  if (filters.tier) {
    filterExpressions.push('subscriptionTier = :tier');
    expressionAttributeValues[':tier'] = filters.tier;
  }

  if (filters.status) {
    filterExpressions.push('subscriptionStatus = :status');
    expressionAttributeValues[':status'] = filters.status;
  }

  if (filters.dateFrom && filters.dateTo) {
    filterExpressions.push('createdAt BETWEEN :dateFrom AND :dateTo');
    expressionAttributeValues[':dateFrom'] = filters.dateFrom;
    expressionAttributeValues[':dateTo'] = filters.dateTo;
  } else if (filters.dateFrom) {
    filterExpressions.push('createdAt >= :dateFrom');
    expressionAttributeValues[':dateFrom'] = filters.dateFrom;
  } else if (filters.dateTo) {
    filterExpressions.push('createdAt <= :dateTo');
    expressionAttributeValues[':dateTo'] = filters.dateTo;
  }

  if (filters.isAdmin !== undefined) {
    filterExpressions.push('isAdmin = :isAdmin');
    expressionAttributeValues[':isAdmin'] = filters.isAdmin;
  }

  if (filters.isBeta !== undefined) {
    expressionAttributeNames['#isBeta'] = 'isBeta';
    if (filters.isBeta) {
      filterExpressions.push('#isBeta = :isBeta');
    } else {
      filterExpressions.push('(attribute_not_exists(#isBeta) OR #isBeta = :isBeta)');
    }
    expressionAttributeValues[':isBeta'] = filters.isBeta;
  }

  // Build scan command
  const scanCommand = new ScanCommand({
    TableName: process.env.DYNAMODB_USERS_TABLE || 'spotter-users',
    FilterExpression:
      filterExpressions.length > 0
        ? filterExpressions.join(' AND ')
        : undefined,
    ExpressionAttributeValues:
      Object.keys(expressionAttributeValues).length > 0
        ? expressionAttributeValues
        : undefined,
    ExpressionAttributeNames:
      Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined,
    Limit: filters.limit || 50,
    ExclusiveStartKey: filters.lastEvaluatedKey,
  });

  const result = await getDynamoDb().send(scanCommand);

  return {
    users: (result.Items as DynamoDBUser[]) || [],
    count: result.Count || 0,
    hasMore: !!result.LastEvaluatedKey,
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Sanitize user data for admin view
 * Removes sensitive fields and formats data
 */
function sanitizeUserForAdmin(user: DynamoDBUser) {
  const scanLimit = getQuotaLimit(
    normalizeSubscriptionTier(user.subscriptionTier),
    'workoutScansMonthly'
  );
  const scanUsed = user.scanQuotaUsed ?? ((user.ocrQuotaUsed || 0) + (user.instagramImportsUsed || 0));
  const scanResetDate =
    user.scanQuotaResetDate ||
    user.ocrQuotaResetDate ||
    user.lastInstagramImportReset ||
    null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate || null,
    subscriptionEndDate: user.subscriptionEndDate || null,
    trialEndsAt: user.trialEndsAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isAdmin: user.isAdmin || false,
    roles: user.roles || [],
    isBeta: user.isBeta || false,
    isDisabled: user.isDisabled || false,
    disabledAt: user.disabledAt || null,
    disabledBy: user.disabledBy || null,
    disabledReason: user.disabledReason || null,
    hasStripeSubscription: Boolean(user.stripeSubscriptionId),
    quotas: {
      scan: {
        used: scanUsed,
        limit: scanLimit,
        resetDate: scanResetDate,
      },
      ocr: {
        used: user.ocrQuotaUsed || 0,
        limit: null,
        resetDate: user.ocrQuotaResetDate || null,
      },
      ai: {
        used: user.aiRequestsUsed || 0,
        limit: user.aiRequestsLimit || 0,
        resetDate: user.lastAiRequestReset || null,
      },
      instagram: {
        used: user.instagramImportsUsed || 0,
        limit: null,
        resetDate: user.lastInstagramImportReset || null,
      },
    },
    costs: {
      currentMonth: user.currentMonthCost || 0,
      currentMonthTokens: user.currentMonthTokens || 0,
      currentMonthRequests: user.currentMonthRequests || 0,
      total: user.totalCost || 0,
      totalTokens: user.totalTokens || 0,
      totalRequests: user.totalRequests || 0,
    },
    workoutsSaved: user.workoutsSaved || 0,
    onboardingCompleted: user.onboardingCompleted || false,
    onboardingCompletedAt: user.onboardingCompletedAt || null,
    emailVerified: user.emailVerified ? 'verified' : 'unverified',
    // NEVER expose these fields:
    // - passwordHash
    // - stripeCustomerId (PII)
    // - stripeSubscriptionId (PII)
  };
}
