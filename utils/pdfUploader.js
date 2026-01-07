import fs from "fs";
import path from "path";
import multer from "multer";

const storage = (folder) =>
    multer.diskStorage({
        destination(req, file, cb) {
            const uploadPath = path.join(process.cwd(), folder);
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename(req, file, cb) {
            const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `${unique}.pdf`);
        },
    });

export const pdfUpload = (folder) =>
    multer({
        storage: storage(folder),
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter(req, file, cb) {
            if (file.mimetype === "application/pdf") cb(null, true);
            else cb(new Error("Only PDF allowed"));
        },
    });
