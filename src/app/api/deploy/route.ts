import { NextResponse } from "next/server";
import crypto from "crypto";

const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN || "";

interface DeployRequest {
  projectId: string;
  title: string;
  files: Record<string, { content: string }>;
  netlifyId?: string;
}

export async function POST(req: Request) {
  console.log("[deploy] === DEPLOY API CALLED ===");

  if (!NETLIFY_TOKEN) {
    console.error("[deploy] No NETLIFY_ACCESS_TOKEN configured");
    return NextResponse.json(
      { error: "NETLIFY_ACCESS_TOKEN not configured" },
      { status: 500 }
    );
  }
  console.log("[deploy] Token present, length:", NETLIFY_TOKEN.length);

  try {
    const body: DeployRequest = await req.json();
    const { title, files, netlifyId } = body;

    const fileKeys = Object.keys(files);
    console.log("[deploy] Received files:", fileKeys.length);
    console.log("[deploy] File paths:", fileKeys);
    for (const [k, v] of Object.entries(files)) {
      console.log(`[deploy]   ${k} -> ${v.content?.length ?? 0} bytes`);
    }
    console.log("[deploy] Existing netlifyId:", netlifyId || "none");

    // Step 1: Create or reuse site
    let siteId = netlifyId;
    if (!siteId) {
      const safeName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      const suffix = crypto.randomBytes(3).toString("hex");
      const siteName = `${safeName}-${suffix}`;
      console.log("[deploy] Creating new site:", siteName);

      const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: siteName }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("[deploy] Site creation failed:", createRes.status, errText);
        return NextResponse.json({ error: `Failed to create site: ${errText}` }, { status: 500 });
      }

      const siteData = await createRes.json();
      siteId = siteData.id;
      console.log("[deploy] Site created. ID:", siteId, "URL:", siteData.ssl_url);
    } else {
      console.log("[deploy] Reusing site:", siteId);
    }

    // Step 2: Build digest
    const fileDigest: Record<string, string> = {};
    const sha1ToFile: Record<string, { path: string; content: string }> = {};

    for (const [filePath, file] of Object.entries(files)) {
      const content = file.content;
      const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
      const sha1 = crypto.createHash("sha1").update(content).digest("hex");
      fileDigest[normalizedPath] = sha1;
      sha1ToFile[sha1] = { path: normalizedPath, content };
    }

    if (!fileDigest["/index.html"]) {
      console.warn("[deploy] No /index.html in files, adding fallback");
      const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Deploy</title></head><body><p>Build produced no index.html</p></body></html>`;
      const sha1 = crypto.createHash("sha1").update(fallbackHtml).digest("hex");
      fileDigest["/index.html"] = sha1;
      sha1ToFile[sha1] = { path: "/index.html", content: fallbackHtml };
    }

    console.log("[deploy] File digest (path -> sha1):");
    for (const [path, sha1] of Object.entries(fileDigest)) {
      console.log(`[deploy]   ${path} -> ${sha1}`);
    }

    // Step 3: Create deploy
    console.log("[deploy] Creating deploy on site:", siteId);
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: fileDigest }),
      }
    );

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      console.error("[deploy] Deploy creation failed:", deployRes.status, errText);
      return NextResponse.json({ error: `Failed to create deploy: ${errText}` }, { status: 500 });
    }

    const deployData = await deployRes.json();
    const deployId = deployData.id;
    const requiredHashes: string[] = deployData.required || [];
    console.log("[deploy] Deploy created. ID:", deployId);
    console.log("[deploy] Required files to upload:", requiredHashes.length);
    console.log("[deploy] Required hashes:", requiredHashes);

    // Step 4: Upload required files
    let uploadSuccess = 0;
    let uploadFail = 0;
    for (const sha1 of requiredHashes) {
      const fileInfo = sha1ToFile[sha1];
      if (!fileInfo) {
        console.error(`[deploy] No file found for hash ${sha1}`);
        uploadFail++;
        continue;
      }

      console.log(`[deploy] Uploading: ${fileInfo.path} (${fileInfo.content.length} bytes)`);
      const uploadUrl = `https://api.netlify.com/api/v1/deploys/${deployId}/files${fileInfo.path}`;
      console.log(`[deploy] Upload URL: ${uploadUrl}`);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: fileInfo.content,
      });

      if (uploadRes.ok) {
        console.log(`[deploy] ✓ Uploaded ${fileInfo.path}`);
        uploadSuccess++;
      } else {
        const errText = await uploadRes.text();
        console.error(`[deploy] ✗ Failed ${fileInfo.path}: ${uploadRes.status} ${errText}`);
        uploadFail++;
      }
    }

    const url = deployData.ssl_url || deployData.deploy_ssl_url || `https://${deployData.subdomain}.netlify.app`;
    console.log("[deploy] === DEPLOY COMPLETE ===");
    console.log("[deploy] URL:", url);
    console.log("[deploy] Uploaded:", uploadSuccess, "Failed:", uploadFail);

    return NextResponse.json({
      url,
      siteId,
      deployId,
      filesUploaded: uploadSuccess,
      filesFailed: uploadFail,
      totalFiles: Object.keys(fileDigest).length,
      requiredCount: requiredHashes.length,
    });
  } catch (error: any) {
    console.error("[deploy] FATAL ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Deploy failed" },
      { status: 500 }
    );
  }
}
