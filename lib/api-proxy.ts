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
  const response = await fetch(`${backendBaseUrl}${endpoint}`, {
    body,
    headers: buildForwardHeaders(request, body),
    method,
  });

  const responseText = await response.text();
  const contentType = response.headers.get("content-type") ?? "application/json";

  return new Response(responseText, {
    headers: {
      "Content-Type": contentType,
    },
    status: response.status,
  });
}
