import JSZip from "jszip";
import type { ProjectFile } from "@/types";

export async function downloadProjectZip(
  projectTitle: string,
  files: Record<string, ProjectFile>
) {
  const zip = new JSZip();

  for (const [filePath, file] of Object.entries(files)) {
    zip.file(filePath, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const safeName = projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "project";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
