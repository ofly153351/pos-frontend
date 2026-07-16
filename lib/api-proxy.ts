const backendBaseUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

function buildForwardHeaders(request: Request, body: BodyInit | undefined) {
  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  let accessTokenFromCookie = "";

  if (cookieHeader) {
    const matchedToken = cookieHeader.match(/(?:^|;\s*)pos-access-token=([^;]+)/);
    accessTokenFromCookie = matchedToken?.[1] ?? "";
  }

  if (authHeader) {
    headers.set("Authorization", authHeader);
  } else if (accessTokenFromCookie) {
    headers.set("Authorization", `Bearer ${decodeURIComponent(accessTokenFromCookie)}`);
  }

  if (contentType && !(body instanceof FormData)) {
    headers.set("Content-Type", contentType);
  }

  // Forward the idempotency key (Phase W3 confirm idempotency) so a retried request
  // reaches the backend with the same key.
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  return headers;
}

export async function proxyApiRequest(
  request: Request,
  endpoint: string,
  options?: {
    body?: BodyInit;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  },
) {
  const method = options?.method ?? request.method;
  const body = options?.body;
  const incomingUrl = new URL(request.url);
  const targetUrl = `${backendBaseUrl}${endpoint}${incomingUrl.search}`;
  const response = await fetch(targetUrl, {
    body,
    headers: buildForwardHeaders(request, body),
    method,
  });

  const responseBody = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "application/json";
  const contentDisposition = response.headers.get("content-disposition");
  const cacheControl = response.headers.get("cache-control");
  const contentLength = response.headers.get("content-length");

  const headers = new Headers({
    "Content-Type": contentType,
  });

  if (contentDisposition) {
    headers.set("Content-Disposition", contentDisposition);
  }

  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
  }

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(responseBody, {
    headers,
    status: response.status,
  });
}
