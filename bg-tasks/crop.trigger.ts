import { task } from "@trigger.dev/sdk";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Transloadit } from "transloadit";

// Load project .env so Trigger.dev worker sees TRANSLOADIT_STORE_CREDENTIALS etc.
function loadEnvFile(filePath: string) {
    try {
        const content = fs.readFileSync(filePath, "utf8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const eq = trimmed.indexOf("=");
                if (eq > 0) {
                    const key = trimmed.slice(0, eq).trim();
                    let value = trimmed.slice(eq + 1).trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
                        value = value.slice(1, -1);
                    if (!process.env[key]) process.env[key] = value;
                }
            }
        }
    } catch {
        // ignore missing file
    }
}
loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

/** Get image width/height from buffer (JPEG or PNG) without ffprobe. No extra deps. */
function getImageDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } {
    if (buffer.length < 24) throw new Error("Image buffer too small");
    // JPEG: starts with FFD8, dimensions in first SOF (FFC0/FFC1/FFC2)
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let i = 2;
        while (i < buffer.length - 7) {
            if (buffer[i] !== 0xff) { i++; continue; }
            const marker = buffer[i + 1];
            if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
                const height = buffer.readUInt16BE(i + 5);
                const width = buffer.readUInt16BE(i + 7);
                if (width > 0 && height > 0) return { width, height };
            }
            i += 2 + buffer.readUInt16BE(i + 2);
        }
        throw new Error("Could not read JPEG dimensions");
    }
    // PNG: signature then IHDR (length=13, type=IHDR), bytes 16-23 are width (4) + height (4) big-endian
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
        throw new Error("Invalid PNG dimensions");
    }
    throw new Error("Unsupported image format (only JPEG and PNG)");
}

export const cropTask = task({
    id: "crop-image",
    run: async (payload: {
        imageUrl: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }) => {
        const { imageUrl, x, y, width, height } = payload;
        const tempDir = os.tmpdir();
        const inputPath = path.join(tempDir, `input-${Date.now()}.png`);
        const outputPath = path.join(tempDir, `output-${Date.now()}.png`);

        const transloadit = new Transloadit({
            authKey: process.env.TRANSLOADIT_KEY || process.env.NEXT_PUBLIC_TRANSLOADIT_KEY || "",
            authSecret: process.env.TRANSLOADIT_SECRET || process.env.NEXT_PUBLIC_TRANSLOADIT_SECRET || "",
        });

        try {
            // Download the image
            const resp = await fetch(imageUrl);
            if (!resp.ok) {
                throw new Error(`Failed to fetch image: ${resp.statusText}`);
            }
            const ab = await resp.arrayBuffer();
            const buffer = Buffer.from(ab);
            fs.writeFileSync(inputPath, buffer);

            // Get dimensions from buffer (no ffprobe)
            const metadata = getImageDimensionsFromBuffer(buffer);

            // Dynamic import of ffmpeg (used only for crop)
            const ffmpeg = (await import("fluent-ffmpeg")).default;
            if (process.env.FFMPEG_PATH) {
                ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
            }
            if (process.env.FFPROBE_PATH) {
                ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
            }

            // Calculate crop dimensions in pixels
            const cropWidth = Math.round((metadata.width * width) / 100);
            const cropHeight = Math.round((metadata.height * height) / 100);
            const cropX = Math.round((metadata.width * x) / 100);
            const cropY = Math.round((metadata.height * y) / 100);

            // Crop the image using ffmpeg
            await new Promise<void>((resolve, reject) => {
                ffmpeg(inputPath)
                    .outputOptions([
                        '-vf', `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`
                    ])
                    .on("end", () => {
                        console.log("Crop completed successfully");
                        resolve();
                    })
                    .on("error", (err) => {
                        console.error("FFmpeg error:", err);
                        reject(err);
                    })
                    .save(outputPath);
            });

            // Verify output file exists
            if (!fs.existsSync(outputPath)) {
                throw new Error("Output file was not created");
            }

            console.log(outputPath)
            console.log("Uploading to Transloadit...");

            const storeCredentials = process.env.TRANSLOADIT_STORE_CREDENTIALS || process.env.NEXT_PUBLIC_TRANSLOADIT_STORE_CREDENTIALS;
            if (!storeCredentials) {
                throw new Error(
                    "Transloadit store credentials not set. In Transloadit dashboard create Credentials (e.g. S3/R2), then set TRANSLOADIT_STORE_CREDENTIALS in .env to that credentials template ID."
                );
            }

            const assembly = await transloadit.createAssembly({
                files: { cropped: outputPath },
                params: {
                    steps: {
                        store: {
                            robot: "/s3/store",
                            use: ":original",
                            credentials: storeCredentials,
                        },
                    },
                },
                waitForCompletion: true,
            });

            // Results are keyed by step name; store step yields array of { ssl_url, url, ... }
            const results = assembly.results as Record<string, Array<{ ssl_url?: string | null; url?: string | null; signed_ssl_url?: string | null }>>;

            console.log("Transloadit assembly results:", JSON.stringify(assembly.results, null, 2));

            let croppedUrl: string | null = null;

            // Try to get URL from store step first
            if (results?.store?.[0]) {
                const storeResult = results.store[0];
                // Prefer signed_ssl_url for public access, then ssl_url, then url
                croppedUrl = storeResult.signed_ssl_url || storeResult.ssl_url || storeResult.url || null;
                console.log("Store step URLs:", { signed_ssl_url: storeResult.signed_ssl_url, ssl_url: storeResult.ssl_url, url: storeResult.url });
            }

            // Fallback: check all result steps
            if (!croppedUrl && results) {
                for (const stepName of Object.keys(results)) {
                    const arr = results[stepName];
                    if (Array.isArray(arr) && arr[0]) {
                        croppedUrl = arr[0].signed_ssl_url || arr[0].ssl_url || arr[0].url || null;
                        if (croppedUrl) {
                            console.log(`Found URL in step "${stepName}":`, croppedUrl);
                            break;
                        }
                    }
                }
            }

            // Last resort: check uploads
            if (!croppedUrl && assembly.uploads?.[0]) {
                const upload = assembly.uploads[0] as { ssl_url?: string; url?: string; signed_ssl_url?: string };
                croppedUrl = upload.signed_ssl_url || upload.ssl_url || upload.url || null;
                console.log("Upload URLs:", { signed_ssl_url: upload.signed_ssl_url, ssl_url: upload.ssl_url, url: upload.url });
            }

            if (!croppedUrl) {
                console.error("Transloadit assembly response (no URL found):", JSON.stringify({
                    ok: (assembly as { ok?: string }).ok,
                    hasResults: !!assembly.results,
                    resultKeys: assembly.results ? Object.keys(assembly.results) : [],
                    uploadsLength: assembly.uploads?.length ?? 0,
                }));
                throw new Error("Failed to get uploaded URL from Transloadit");
            }

            console.log("Final cropped URL:", croppedUrl);

            // Transform private R2 URL to public URL if needed
            const publicR2Domain = process.env.R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;
            if (publicR2Domain && croppedUrl.includes('.r2.cloudflarestorage.com')) {
                // Extract the path after the bucket name
                const urlParts = croppedUrl.split('.r2.cloudflarestorage.com');
                if (urlParts[1]) {
                    croppedUrl = `${publicR2Domain}${urlParts[1]}`;
                    console.log("Transformed to public URL:", croppedUrl);
                }
            }

            return { success: true, croppedUrl };
        } catch (error) {
            console.error("Crop Task Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return { success: false, error: errorMessage };
        } finally {
            // Clean up temp files
            try {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (cleanupError) {
                console.warn("Cleanup error:", cleanupError);
            }
        }
    },
});