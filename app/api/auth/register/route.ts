import { NextResponse } from "next/server";

import { proxyAuthRequest } from "@/lib/auth-api-proxy";
import type { ApiResponse, AuthPayload } from "@/types/auth";

export async function POST(request: Request) {
  const proxiedResponse = await proxyAuthRequest(request, "/api/v1/auth/register");
  const payload = (await proxiedResponse.json()) as ApiResponse<AuthPayload>;

  const response = NextResponse.json(payload, {
    status: proxiedResponse.status,
  });

  if (proxiedResponse.ok && payload.success && payload.data?.access_token) {
    response.cookies.set("pos-access-token", payload.data.access_token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    if (payload.data.store_id) {
      response.cookies.set("pos-store-id", payload.data.store_id, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } else {
      response.cookies.delete("pos-store-id");
    }
  }

  return response;
}