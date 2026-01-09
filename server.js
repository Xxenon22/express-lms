import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
// import multer from "multer";

import authRoutes from "./routes/authRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import mapel from "./routes/mapelRoutes.js";
import rombel from "./routes/rombelRoutes.js";
import gradeLevel from "./routes/gradeLevelRoutes.js";
import teachers from "./routes/teacherRoutes.js";
import phase from "./routes/phaseRoutes.js";
import rpk from "./routes/rpkRoutes.js";
import rpkMemahami from "./routes/rpkMemahamiRoutes.js";
import rpkMengaplikasikan from "./routes/rpkMengaplikasikanRoutes.js";
import rpkMerefleksi from "./routes/rpkMerefleksiRoutes.js";
import rpkRefleksi from "./routes/rpkRefleksiRoutes.js";
import bankSoal from "./routes/bankSoalRoutes.js";
import soal from "./routes/soalPilganRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import modulePembelajaran from "./routes/modulePembelajaranRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import forumDiscuss from "./routes/forumDiscussRoutes.js";
import uploadGambarSoal from "./routes/uploadGambarSoalRoutes.js";
import uploadProfileRoutes from "./routes/uploadProfileRoutes.js";
import jurusan from "./routes/jurusanRoutes.js";
import timetable from "./routes/timetablesRoutes.js";
import timetableX from "./routes/timetablesGradeXRoutes.js";
import timetableXI from "./routes/timetablesGradeXIRoutes.js";
import classFollowRoutes from "./routes/classFollowRoutes.js";
import progressMateri from "./routes/progressRoutes.js";
import jawabanSiswa from "./routes/jawabanSiswaRoutes.js";
import rombelNumber from "./routes/rombelNumRoutes.js";
import maintenanceMiddleware from "./middleware/maintanceMiddleware.js";
import maintenanceRoutes from "./routes/maintananceRoute.js";

dotenv.config();
const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// handle preflight OPTIONS untuk semua route
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
    } else {
        next();
    }
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Jika kamu pakai multer, pastikan storage-nya juga benar
// const upload = multer({
//     limits: { fileSize: 50 * 1024 * 1024 }
// });


// setup dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================== ROUTES ======================
app.use("/api", maintenanceMiddleware);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kelas", classRoutes);
app.use("/api/mapel", mapel);
app.use("/api/rombel", rombel);
app.use("/api/number-rombel", rombelNumber);
app.use("/api/grade-level", gradeLevel);
app.use("/api/teacher", teachers);
app.use("/api/phase", phase);
app.use("/api/rpk", rpk);
app.use("/api/rpk-memahami", rpkMemahami);
app.use("/api/rpk-mengaplikasikan", rpkMengaplikasikan);
app.use("/api/rpk-merefleksi", rpkMerefleksi);
app.use("/api/rpk-refleksi", rpkRefleksi);
app.use("/api/bank-soal", bankSoal);
app.use("/api/soal", verifyToken, soal);
app.use("/api/module-pembelajaran", modulePembelajaran);
app.use("/api/forum-discuss", forumDiscuss);
app.use("/api/jurusan", jurusan);
app.use("/api/timetables", timetable);
app.use("/api/timetables-grade-x", timetableX);
app.use("/api/timetables-grade-xi", timetableXI);
app.use("/api/kelas-diikuti", classFollowRoutes);
app.use("/api/progress-materi", progressMateri);
app.use("/api/jawaban-siswa", jawabanSiswa);
app.use("api/maintanance", maintanance)

// ================== UPLOADS & STATIC FILES ==================

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// upload soal
app.use("/api/gambar-soal", uploadGambarSoal);
app.use(
    "/uploads/gambar-soal",
    express.static(path.join(__dirname, "uploads/gambar-soal"))
);

// Static files (uploads) access
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Upload routes
app.use("/api/uploads/photo-profile", uploadProfileRoutes);


// timetables
app.use(
    "/uploads/timetables",
    express.static(path.join(__dirname, "uploads/timetables"))
);
app.use(
    "/uploads/timetables-grade-x",
    express.static(path.join(__dirname, "uploads/timetables-grade-x"))
);

app.use(
    "/uploads/timetables-grade-xi",
    express.static(path.join(__dirname, "uploads/timetables-grade-xi"))
);

// Wallpapers
app.use("/api/wallpapers", express.static(path.join(process.cwd(), "uploads/wallpapers")));

// File Jawaban Siswa
app.use(
    "/uploads/file-jawaban-siswa",
    express.static(path.join(__dirname, "uploads/file-jawaban-siswa"))
);

// ================== SERVER START ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(` Server running on port ${PORT}`));

app.get("/api", (req, res) => {
    res.send("Backend is running 🚀");
});

// Pastikan ini ditaruh PALING BAWAH setelah semua route
app.use((err, req, res, next) => {
    console.error("🔥 Unhandled Error:", err);

    res.status(500).json({
        error: "An unexpected error occurred on the server. Please try again later.",
    });
});
