import { task } from "@trigger.dev/sdk";

export const testTask = task({
    id: "test-task",
    run: async (payload: { message: string }) => {
        console.log("Test task running:", payload.message);
        return { success: true, received: payload.message };
    },
});
