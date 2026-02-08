import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const geminiTask = task({
    id: "gemini-llm",
    run: async (payload: {
        model: string;
        systemPrompt?: string;
        userMessage: string;
        images?: string[];
    }) => {
        const { model, systemPrompt, userMessage, images } = payload;

        try {
            const geminiModel = genAI.getGenerativeModel({
                model: model || "gemini-1.5-flash",
                systemInstruction: systemPrompt
            });

            const contents: any[] = [userMessage];

            if (images && images.length > 0) {
                for (const imageUrl of images) {
                    const response = await fetch(imageUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString("base64");
                    const contentType = response.headers.get("content-type") || "image/jpeg";

                    contents.push({
                        inlineData: {
                            data: base64,
                            mimeType: contentType,
                        },
                    });
                }
            }

            const result = await geminiModel.generateContent(contents);
            const response = await result.response;
            const text = response.text();

            return {
                success: true,
                response: text,
                model: model
            };
        } catch (error) {
            console.error("Gemini Task Error:", error);
            throw error;
        }
    },
});
