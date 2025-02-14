"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
function authMiddleware(req, res, next) {
    const token = req.headers["authorization"];
    if (!token)
        return res.status(403).send("Unauthorized");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        res.status(403).send("Invalid token");
    }
}
exports.authMiddleware = authMiddleware;
function workerMiddleware(req, res, next) {
    const token = req.headers["authorization"];
    if (!token)
        return res.status(403).send("Unauthorized");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.WORKER_JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        res.status(403).send("Invalid token");
    }
}
exports.workerMiddleware = workerMiddleware;
