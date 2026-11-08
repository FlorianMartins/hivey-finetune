// Worlds for the 27B (seed 2: not the expert's worlds), as a task list for run.mjs.
import { teacherTasks } from "./families2.mjs";

export const TASKS = teacherTasks(Number(process.env.TEACHER_SEED || "2"), Number(process.env.TEACHER_SCALE || "0.4"));
