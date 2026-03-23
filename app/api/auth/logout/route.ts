import { NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const proxiedResponse = await proxyApiRequest(request, "/api/v1/auth/logout", {
    method: "POST",
  });

  const responseText = await proxiedResponse.text();
  const contentType = proxiedResponse.headers.get("content-type") ?? "application/json";
  const response = new NextResponse(responseText, {
    headers: {
      "Content-Type": contentType,
    },
    status: proxiedResponse.status,
  });

  response.cookies.delete("pos-access-token");
  response.cookies.delete("pos-store-id");

  return response;
}
