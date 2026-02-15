/**
 * Admin API - Reset User Quotas
 *
 * POST /api/admin/reset-quotas
 *
 * Allows admins to reset quotas for a specific user.
 * Requires admin authentication.
 *
 * Request Body:
 * {
 *   "userId": "user-id-or-email",
 *   "quotaType": "ocr" | "ai" | "instagram" | "all"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/request-ip';

interface ResetQuotasRequest {
  userId?: string;
  email?: string;
  quotaType: 'ocr' | 'ai' | 'instagram' | 'all';
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { userId: adminUserId } = auth;

    // Check if requesting user is authorized
    const adminUser = await dynamoDBUsers.get(adminUserId);
    if (!adminUser || !hasPermission(adminUser, 'admin:reset-quotas')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Admin access required'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body: ResetQuotasRequest = await req.json();
    const { userId, email, quotaType } = body;

    if (!userId && !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either userId or email is required'
        },
        { status: 400 }
      );
    }

    if (!quotaType || !['ocr', 'ai', 'instagram', 'all'].includes(quotaType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid quotaType. Must be: ocr, ai, instagram, or all'
        },
        { status: 400 }
      );
    }

    // Get target user
    let targetUser;
    if (email) {
      targetUser = await dynamoDBUsers.getByEmail(email);
      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: `User not found with email: ${email}`
          },
          { status: 404 }
        );
      }
    } else if (userId) {
      targetUser = await dynamoDBUsers.get(userId);
      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: `User not found with ID: ${userId}`
          },
          { status: 404 }
        );
      }
    }

    const targetUserId = targetUser!.id;

    // Reset quotas based on type
    const resetResults: Record<string, boolean> = {};

    try {
      if (quotaType === 'ocr' || quotaType === 'instagram' || quotaType === 'all') {
        await dynamoDBUsers.resetScanQuota(targetUserId);
        resetResults.scans = true;
      }

      if (quotaType === 'ai' || quotaType === 'all') {
        await dynamoDBUsers.resetAIQuota(targetUserId);
        resetResults.ai = true;
      }
    } catch (error) {
      console.error('[Admin] Error resetting quotas:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset quotas',
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }

    // Get updated user info
    const updatedUser = await dynamoDBUsers.get(targetUserId);

    console.log(`[Admin] Quotas reset by ${adminUser.email} for user ${targetUser!.email}`);
    console.log(`[Admin] Reset types: ${Object.keys(resetResults).join(', ')}`);

    await writeAuditLog({
      action: 'admin.reset-quotas',
      actorId: adminUserId,
      actorEmail: adminUser.email,
      targetId: targetUserId,
      targetEmail: targetUser?.email || null,
      ipAddress: getRequestIp(req.headers),
      metadata: {
        quotaType,
        reset: resetResults,
      },
    });

    const quotaLabel = quotaType === 'ocr' || quotaType === 'instagram' ? 'scan' : quotaType;

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${quotaType === 'all' ? 'all quotas' : quotaLabel + ' quota'} for user ${targetUser!.email}`,
      reset: resetResults,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        subscriptionTier: updatedUser?.subscriptionTier,
        quotas: {
          scanUsed: updatedUser?.scanQuotaUsed || 0,
          scanResetDate: updatedUser?.scanQuotaResetDate,
          ocrUsed: updatedUser?.ocrQuotaUsed || 0,
          ocrResetDate: updatedUser?.ocrQuotaResetDate,
          aiUsed: updatedUser?.aiRequestsUsed || 0,
          aiResetDate: updatedUser?.lastAiRequestReset,
          instagramUsed: updatedUser?.instagramImportsUsed || 0,
          instagramResetDate: updatedUser?.lastInstagramImportReset,
        }
      }
    });

  } catch (error) {
    console.error('[Admin] Reset quotas error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
