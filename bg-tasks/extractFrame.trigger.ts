import { task } from "@trigger.dev/sdk";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Transloadit } from "transloadit";

export const extractFrameTask = task({
    id: "extract-frame",
    run: async (payload: {
        videoUrl: string;
        timestamp: string | number;
    }) => {
        // Dynamic import to avoid top-level issues if ffmpeg is missing during node initialization
        const ffmpeg = (await import("fluent-ffmpeg")).default;

        const { videoUrl, timestamp } = payload;
        const tempDir = os.tmpdir();
        const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
        const outputPath = path.join(tempDir, `frame-${Date.now()}.jpg`);

        const transloadit = new Transloadit({
            authKey: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY || process.env.TRANSLOADIT_KEY || "",
            authSecret: process.env.NEXT_PUBLIC_TRANSLOADIT_SECRET || process.env.TRANSLOADIT_SECRET || "",
        });

        try {
            console.log("[Extract Frame] Downloading video from:", videoUrl);
            const resp = await fetch(videoUrl);

            if (!resp.ok) {
                throw new Error(`Failed to download video: ${resp.status} ${resp.statusText}`);
            }

            const ab = await resp.arrayBuffer();
            console.log("[Extract Frame] Downloaded video size:", ab.byteLength, "bytes");

            fs.writeFileSync(inputPath, Buffer.from(ab));

            // Verify file
            const fileSize = fs.statSync(inputPath).size;
            console.log("[Extract Frame] Saved to:", inputPath, "(" + fileSize + " bytes)");

            if (fileSize === 0) {
                throw new Error("Downloaded video file is empty");
            }

            // Validate timestamp
            let validTimestamp = timestamp || '50%';
            if (validTimestamp === '' || validTimestamp === 'undefined' || validTimestamp === 'null') {
                validTimestamp = '50%';
            }
            console.log("[Extract Frame] Using timestamp:", validTimestamp);

            let timeValue = 0;
            if (typeof validTimestamp === "string" && validTimestamp.endsWith("%")) {
                const percentage = parseFloat(validTimestamp);
                const duration = await new Promise<number>((resolve, reject) => {
                    ffmpeg.ffprobe(inputPath, (err, metadata) => {
                        if (err) reject(err);
                        else resolve(metadata.format.duration || 0);
                    });
                });
                timeValue = (duration * percentage) / 100;
                console.log(`[Extract Frame] ${percentage}% of ${duration}s = ${timeValue}s`);
            } else {
                timeValue = typeof validTimestamp === "string" ? parseFloat(validTimestamp) : validTimestamp;
            }

            console.log("[Extract Frame] Extracting frame at:", timeValue, "seconds");
            await new Promise<void>((resolve, reject) => {
                ffmpeg(inputPath)
                    .seekInput(timeValue)
                    .frames(1)
                    .outputOptions("-q:v", "2")
                    .on("start", (cmd) => console.log("[Extract Frame] FFmpeg command:", cmd))
                    .on("end", () => {
                        console.log("[Extract Frame] FFmpeg completed successfully");
                        resolve();
                    })
                    .on("error", (err) => {
                        console.error("[Extract Frame] FFmpeg error:", err.message);
                        reject(err);
                    })
                    .save(outputPath);
            });

            const storeCredentials = process.env.TRANSLOADIT_STORE_CREDENTIALS || process.env.NEXT_PUBLIC_TRANSLOADIT_STORE_CREDENTIALS || "workflow-test-app";

            const assembly = await transloadit.createAssembly({
                files: { frame: outputPath },
                params: {
                    steps: {
                        store: {
                            robot: "/s3/store",
                            use: ":original",
                            credentials: storeCredentials
                        },
                    },
                },
                waitForCompletion: true,
            });

            let frameUrl = assembly.results?.store?.[0]?.ssl_url || assembly.results?.store?.[0]?.url || assembly.uploads?.[0]?.url;

            if (!frameUrl) {
                throw new Error("No frame URL returned from Transloadit");
            }

            // Transform private R2 URL to public URL if needed
            const publicR2Domain = process.env.R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;
            if (publicR2Domain && frameUrl.includes('.r2.cloudflarestorage.com')) {
                const urlParts = frameUrl.split('.r2.cloudflarestorage.com');
                if (urlParts[1]) {
                    frameUrl = `${publicR2Domain}${urlParts[1]}`;
                    console.log("Transformed frame URL to public:", frameUrl);
                }
            }

            return { success: true, frameUrl };
        } catch (error) {
            console.error("Extract Frame Task Error:", error);
            throw error;
        } finally {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    },
});
