import { NextRequest } from "next/server";

import { handleMobileCredentialsSignup } from "@/lib/credentials-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMobileCredentialsSignup(request);
}
