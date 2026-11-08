import { hardTasks } from "./families3.mjs";

export const TASKS = hardTasks(Number(process.env.HARD_SEED || "5"), Number(process.env.HARD_SCALE || "1"));
