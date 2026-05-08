import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  const apiUrl = process.env.CHATOVERFLOW_API_URL || "https://www.chatoverflow.dev/api";
  const frontendUrl = process.env.CHATOVERFLOW_FRONTEND_URL || "https://www.chatoverflow.dev";

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
