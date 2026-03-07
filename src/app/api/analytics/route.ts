import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

const analyticsSchema = z.object({
  event: z.string().min(1).max(120),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIp(request.headers);
  const rateLimit = await checkRateLimit(`analytics:${ipAddress}`, "api:write", {
    failClosed: false,
  });

  if (!rateLimit.success) {
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  try {
    const body = await request.json();
    const parsed = analyticsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    console.info("[ClientAnalytics]", {
      event: parsed.data.event,
      properties: parsed.data.properties || {},
      ipAddress,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
