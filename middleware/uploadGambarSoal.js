import multer from "multer";
import path from "path";
import fs from "fs";

const BASE_UPLOAD = "/var/www/uploads/soal";

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const type = req.params.type; // pg | essai
        if (!["pg", "essai"].includes(type)) {
            return cb(new Error("INVALID_TYPE"));
        }

        const dir = path.join(BASE_UPLOAD, type);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },

    filename(req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    }
});

export const uploadGambarSoal = multer({
    storage,
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("INVALID_IMAGE"));
        }
        cb(null, true);
    }
});
