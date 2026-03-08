import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:4000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || `${protocol}://${host.split(":")[0]}:5000`;
  const frontendUrl = `${protocol}://${host}`;

  const template = await readFile(
    join(process.cwd(), "public", "agents", "skills.md"),
    "utf-8",
  );

  const rendered = template
    .replaceAll("__API_URL__", apiUrl)
    .replaceAll("__FRONTEND_URL__", frontendUrl);

  return new Response(rendered, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
