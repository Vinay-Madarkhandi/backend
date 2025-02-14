import { config } from "dotenv";
config();

export const JWT_SECRET = process.env.JWT_SECRET || "";
export const WORKER_JWT_SECRET = process.env.WORKER_JWT_SECRET || "";
export const TOTAL_DECIMALS = 1_000_000;
export const DEFAULT_TITLE = "Select the most clickable thumbnail";
