"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const middleware_1 = require("../middleware");
const types_1 = require("../types");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const config_1 = require("../config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
const connection = new web3_js_1.Connection(process.env.RPC_URL || "");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID || "",
        secretAccessKey: process.env.ACCESS_SECRET || "",
    },
});
const PARENT_WALLET_ADDRESS = process.env.PARENT_WALLET_ADDRESS || "";
// Improved GET /task Route
router.get("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.query.taskId;
        const userId = req.userId;
        const taskDetails = yield prisma.task.findFirst({
            where: { user_id: Number(userId), id: Number(taskId) },
            include: { options: true },
        });
        if (!taskDetails) {
            return res.status(404).json({ message: "Task not found or access denied" });
        }
        const responses = yield prisma.submission.findMany({
            where: { task_id: Number(taskId) },
            include: { option: true },
        });
        const result = taskDetails.options.reduce((acc, option) => {
            acc[option.id] = { count: 0, option: { imageUrl: option.image_url } };
            return acc;
        }, {});
        responses.forEach((r) => {
            if (result[r.option_id]) {
                result[r.option_id].count++;
            }
        });
        res.json({ result, taskDetails });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Improved POST /task Route
router.post("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const userId = req.userId;
        const parseData = types_1.createTaskInput.safeParse(req.body);
        if (!parseData.success) {
            return res.status(400).json({ message: "Invalid inputs", errors: parseData.error });
        }
        const transaction = yield connection.getTransaction(parseData.data.signature, {
            maxSupportedTransactionVersion: 1,
        });
        if (!transaction ||
            ((_b = (_a = transaction.meta) === null || _a === void 0 ? void 0 : _a.postBalances[1]) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = transaction.meta) === null || _c === void 0 ? void 0 : _c.preBalances[1]) !== null && _d !== void 0 ? _d : 0) !== 100000000 ||
            ((_e = transaction.transaction.message.getAccountKeys().get(1)) === null || _e === void 0 ? void 0 : _e.toString()) !== PARENT_WALLET_ADDRESS) {
            return res.status(400).json({ message: "Invalid transaction" });
        }
        const response = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _f;
            const task = yield tx.task.create({
                data: {
                    title: (_f = parseData.data.title) !== null && _f !== void 0 ? _f : config_1.DEFAULT_TITLE,
                    amount: 0.1 * config_1.TOTAL_DECIMALS,
                    signature: parseData.data.signature,
                    user_id: Number(userId),
                },
            });
            yield tx.option.createMany({
                data: parseData.data.options.map((x) => ({
                    image_url: x.imageUrl,
                    task_id: task.id,
                })),
            });
            return task;
        }));
        res.json({ id: response.id });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Improved GET /presignedUrl Route
router.get("/presignedUrl", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { url, fields } = yield (0, s3_presigned_post_1.createPresignedPost)(s3Client, {
            Bucket: process.env.S3_BUCKET_NAME || "", // Ensure this is defined in your .env
            Key: `${userId}/${Date.now()}/image.jpg`,
            Conditions: [
                ["content-length-range", 0, 5 * 1024 * 1024], // Max 5 MB
            ],
            Expires: 3600, // 1 hour expiry
        });
        res.json({ preSignedUrl: url, fields });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate pre-signed URL" });
    }
}));
// Improved POST /signin Route
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { publicKey, signature } = req.body;
        const message = new TextEncoder().encode("Sign into mechanical turks");
        const isVerified = tweetnacl_1.default.sign.detached.verify(message, new Uint8Array(signature.data), new web3_js_1.PublicKey(publicKey).toBytes());
        if (!isVerified) {
            return res.status(400).json({ message: "Invalid signature" });
        }
        const existingUser = yield prisma.user.findFirst({
            where: { address: publicKey },
        });
        let token;
        if (existingUser) {
            token = jsonwebtoken_1.default.sign({ userId: existingUser.id }, config_1.JWT_SECRET);
            res.json({ token });
        }
        else {
            const newUser = yield prisma.user.create({
                data: { address: publicKey },
            });
            token = jsonwebtoken_1.default.sign({ userId: newUser.id }, config_1.JWT_SECRET);
            res.json({ token });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}));
exports.default = router;
