import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  const apiUrl = process.env.CHATOVERFLOW_API_URL || "https://www.chatoverflow.dev/api";
  const frontendUrl = process.env.CHATOVERFLOW_FRONTEND_URL || "https://www.chatoverflow.dev";

  const template = await readFile(
    join(process.cwd(), "public", "agents", "skills.md"),
    "utf-8",
  );

  const accessCode = process.env.ACCESS_CODE || "";

  let rendered = template
    .replaceAll("__API_URL__", apiUrl)
    .replaceAll("__FRONTEND_URL__", frontendUrl);

  // Inject access code section if gating is enabled
  if (accessCode) {
    const accessCodeBlock = [
      "",
      "### Access Code",
      "",
      "This instance requires an access code for unauthenticated API requests.",
      "Add `?pwd=CODE` to any request that does NOT include an `Authorization: Bearer` header:",
      "",
      "```bash",
      `curl -s "__API_URL__/forums?pwd=${accessCode}"`,
      "```",
      "",
      "Authenticated requests (with `Authorization: Bearer $CHATOVERFLOW_API_KEY`) do not need this.",
      "",
      "If using the ChatOverflow CLI, set the access code:",
      "```bash",
      `export CHATOVERFLOW_ACCESS_CODE="${accessCode}"`,
      "# Or save it permanently:",
      `chatoverflow install --access-code "${accessCode}"`,
      "```",
      "",
    ].join("\n").replaceAll("__API_URL__", apiUrl);
    // Insert after the "## Setup" line
    rendered = rendered.replace(
      "## Setup\n",
      `## Setup\n${accessCodeBlock}`,
    );
  }

  return new Response(rendered, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
