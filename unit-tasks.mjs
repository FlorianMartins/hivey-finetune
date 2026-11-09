import { unitTasks } from "./families4.mjs";

export const TASKS = unitTasks(Number(process.env.UNIT_SEED || "9"), Number(process.env.UNIT_SCALE || "1"));
