// // middleware/uploadGambarSoal.js
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const BASE_UPLOAD_PATH = path.join(__dirname, "..", "uploads", "soal");

// const ensureDir = (dir) => {
//     if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//     }
// };

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         // AMBIL TYPE DARI URL
//         const type = req.originalUrl.includes("/pg")
//             ? "pg"
//             : req.originalUrl.includes("/essai")
//                 ? "essai"
//                 : null;

//         if (!type) {
//             return cb(new Error("INVALID_UPLOAD_TYPE"));
//         }

//         const target = path.join(BASE_UPLOAD_PATH, type);
//         ensureDir(target);

//         cb(null, target);
//     },
//     filename: (_, file, cb) => {
//         const ext = path.extname(file.originalname);
//         cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
//     }
// });

// const fileFilter = (_, file, cb) => {
//     if (!file.mimetype.startsWith("image/")) {
//         return cb(new Error("INVALID_IMAGE_TYPE"));
//     }
//     cb(null, true);
// };

// export const uploadSoal = multer({
//     storage,
//     limits: { fileSize: 5 * 1024 * 1024 },
//     fileFilter
// });

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_UPLOAD_PATH = path.join(__dirname, "..", "uploads", "soal");

const ensureDirSafe = (dir) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (err) {
        console.error("❌ Gagal buat folder:", dir, err.message);
        throw err;
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const type = req.params.type; // ← AMBIL DARI ROUTE

            if (!["pg", "essai"].includes(type)) {
                return cb(new Error("INVALID_UPLOAD_TYPE"));
            }

            const targetDir = path.join(BASE_UPLOAD_PATH, type);
            ensureDirSafe(targetDir);

            cb(null, targetDir);
        } catch (err) {
            cb(err);
        }
    },

    filename: (_, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("ONLY_IMAGE_ALLOWED"));
    }
    cb(null, true);
};

export const uploadSoal = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});
