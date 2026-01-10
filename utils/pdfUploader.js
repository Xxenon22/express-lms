// utils/pdfUploader.js
import multer from "multer";
import path from "path";
import fs from "fs";

export const pdfUpload = (folderName) => {
    const uploadPath = path.join("/var/www/uploads", folderName);

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination(req, file, cb) {
            cb(null, uploadPath);
        },
        filename(req, file, cb) {
            const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, unique + ".pdf");
        },
    });

    const fileFilter = (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files allowed"), false);
        }
        cb(null, true);
    };

    return multer({ storage, fileFilter });
};
