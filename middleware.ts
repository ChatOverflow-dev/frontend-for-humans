import { NextRequest, NextResponse } from "next/server";

const ACCESS_CODE = process.env.ACCESS_CODE;
const COOKIE_NAME = "co_access";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function passwordPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChatOverflow – Access Required</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }
    .card { text-align: center; max-width: 360px; padding: 2rem; }
    h1 {
      font-size: 1.1rem; font-weight: 600;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #333; margin-bottom: 1.5rem;
    }
    input {
      width: 100%; padding: 0.6rem 1rem;
      border: 1px solid #e5e5e5; border-radius: 4px;
      font-size: 0.95rem; text-align: center; outline: none;
    }
    input:focus { border-color: #e8863a; }
    button {
      margin-top: 1rem; padding: 0.5rem 2rem;
      background: #e8863a; color: #fff; border: none;
      font-size: 0.85rem; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.12em; cursor: pointer;
    }
    button:hover { background: #d4772f; }
    .err { color: #c00; font-size: 0.8rem; margin-top: 0.75rem; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>ChatOverflow</h1>
    <form id="f">
      <input id="pw" type="password" placeholder="Access code" autofocus>
      <button type="submit">Enter</button>
    </form>
    <p class="err" id="err">Invalid access code</p>
  </div>
  <script>
    document.getElementById('f').addEventListener('submit', function(e) {
      e.preventDefault();
      var code = document.getElementById('pw').value;
      if (!code) return;
      var url = new URL(window.location.href);
      url.searchParams.set('pwd', code);
      window.location.href = url.toString();
    });
    if (new URLSearchParams(window.location.search).has('pwd')) {
      document.getElementById('err').style.display = 'block';
    }
  </script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export function middleware(request: NextRequest) {
  // If no ACCESS_CODE configured, everything is open
  if (!ACCESS_CODE) {
    return NextResponse.next();
  }

  // Requests with Authorization: Bearer pass through (agents calling /api/*)
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.next();
  }

  // Already authenticated via cookie
  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value === ACCESS_CODE) {
    // For /api/* paths, inject the access code header so the backend proxy accepts it
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const headers = new Headers(request.headers);
      headers.set("x-access-code", ACCESS_CODE);
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  // Check ?pwd= query param or X-Access-Code header
  const pwd =
    request.nextUrl.searchParams.get("pwd") ||
    request.headers.get("x-access-code");
  if (pwd === ACCESS_CODE) {
    const accept = request.headers.get("accept") || "";
    const isBrowserGet =
      request.method === "GET" && accept.includes("text/html");

    if (isBrowserGet) {
      // Redirect to clean URL (strip ?pwd) and set cookie
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("pwd");
      const res = NextResponse.redirect(clean);
      res.cookies.set(COOKIE_NAME, ACCESS_CODE, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
      });
      return res;
    }

    // API / curl: pass through, set cookie
    const res = NextResponse.next();
    res.cookies.set(COOKIE_NAME, ACCESS_CODE, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  }

  // --- Unauthenticated ---

  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return passwordPage();
  }

  // Non-browser (curl, agents): JSON 401
  return new NextResponse(
    JSON.stringify({
      error: "Access denied",
      hint: "Include ?pwd=ACCESS_CODE in your request URL",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static assets)
     * - _next/image  (image optimization)
     * - favicon.ico, icon.svg
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg).*)",
  ],
};
