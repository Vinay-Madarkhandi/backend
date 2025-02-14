"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TITLE = exports.TOTAL_DECIMALS = exports.WORKER_JWT_SECRET = exports.JWT_SECRET = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.JWT_SECRET = process.env.JWT_SECRET || "";
exports.WORKER_JWT_SECRET = process.env.WORKER_JWT_SECRET || "";
exports.TOTAL_DECIMALS = 1000000;
exports.DEFAULT_TITLE = "Select the most clickable thumbnail";
