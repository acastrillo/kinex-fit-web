import { NextRequest, NextResponse } from "next/server";

const TRACE_HEADER = "X-Kinex-Auth-Trace-ID";
const MAX_TRACE_LENGTH = 128;

export function getMobileAuthTraceId(request: NextRequest): string {
  const incomingTraceId =
    request.headers.get("x-kinex-auth-trace-id")?.trim() ??
    request.headers.get(TRACE_HEADER)?.trim();

  if (incomingTraceId && incomingTraceId.length <= MAX_TRACE_LENGTH) {
    return incomingTraceId;
  }

  return crypto.randomUUID();
}

export function jsonWithMobileAuthTrace(
  body: unknown,
  init: ResponseInit | undefined,
  traceId: string
): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set(TRACE_HEADER, traceId);
  return response;
}
