// middleware/uploadGambarSoal.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { safeUnlink } from "../utils/safeFile.js";

const BASE_UPLOAD = "/var/www/uploads/jawaban_siswa_file";

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let type = null;

        if (req.params.type === "pg") type = "pg";
        if (req.params.type === "essai") type = "essai";

        if (!type) {
            return cb(new Error("INVALID_UPLOAD_TYPE"));
        }

        const dir = path.join(BASE_UPLOAD, type);
        ensureDir(dir);

        cb(null, dir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("INVALID_IMAGE_TYPE"));
    }
    cb(null, true);
};

export const uploadGambarSoal = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
