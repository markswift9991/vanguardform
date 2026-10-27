export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  const responseText = await response.text();
  let body: unknown;
  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    const contentType = response.headers.get("content-type") || "unknown content type";
    throw new Error(
      `The API returned ${contentType} instead of JSON (HTTP ${response.status}). ` +
      "The site is serving the frontend without the Vanguard PHP API. Check the cPanel document root and Apache rewrite rules, then verify /api/health returns JSON.",
    );
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return body as T;
}
