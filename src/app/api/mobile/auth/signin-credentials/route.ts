import { NextRequest } from "next/server";

import { handleMobileCredentialsSignIn } from "@/lib/credentials-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMobileCredentialsSignIn(request);
}
