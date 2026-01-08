// routes/jawabanSiswaRoutes.js
import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = express.Router()

const uploadDir = path.join(process.cwd(), "uploads/jawaban_siswa_file");

// pastikan folder ada
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const unique = crypto.randomUUID();
        cb(null, `${unique}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.post(
    "/upload/:materiId",
    verifyToken,
    upload.single("file"),
    async (req, res) => {
        try {
            const { materiId } = req.params;
            const userId = req.users.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const filePath = `/uploads/jawaban_siswa_file/${file.filename}`;

            const result = await pool.query(
                `
                INSERT INTO jawaban_siswa
                (user_id, materi_id, file_jawaban_siswa, file_name, file_mime, file_size)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                `,
                [
                    userId,
                    materiId,
                    filePath,
                    file.originalname,
                    file.mimetype,
                    file.size
                ]
            );

            const row = result.rows[0];

            res.json({
                file: {
                    id: row.id,
                    file_name: row.file_name,
                    file_mime: row.file_mime,
                    created_at: row.created_at,
                    url: `${req.protocol}://${req.get("host")}${row.file_jawaban_siswa}`,
                    download_url: `${req.protocol}://${req.get("host")}/api/jawaban-siswa/download/${row.id}`
                }
            });

        } catch (err) {
            console.error("UPLOAD ERROR:", err);
            res.status(500).json({ message: "Upload failed" });
        }
    }
);


/* =========================
   UPLOAD FILE JAWABAN (DB)
========================= */
router.post(
    "/upload-multiple",
    verifyToken,
    upload.array("files"),
    async (req, res) => {
        try {
            const { soal_id, bank_soal_id, materi_id } = req.body;
            const userId = req.users.id;

            if (!req.files?.length) {
                return res.status(400).json({ message: "No files uploaded" });
            }

            const saved = [];

            for (const file of req.files) {
                const filePath = `/uploads/jawaban_siswa_file/${file.filename}`;

                const result = await pool.query(
                    `
                    INSERT INTO jawaban_siswa
                        (user_id, soal_id, bank_soal_id, materi_id,
                         file_jawaban_siswa, file_mime, file_name, file_size, created_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
                    ON CONFLICT (user_id, soal_id, bank_soal_id)
                    DO UPDATE SET
                        file_jawaban_siswa = EXCLUDED.file_jawaban_siswa,
                        file_mime = EXCLUDED.file_mime,
                        file_name = EXCLUDED.file_name,
                        file_size = EXCLUDED.file_size,
                        created_at = NOW()
                    RETURNING *
                    `,
                    [
                        userId,
                        soal_id || null,
                        bank_soal_id,
                        materi_id || null,
                        filePath,
                        file.mimetype,
                        file.originalname,
                        file.size
                    ]
                );

                saved.push(result.rows[0]);
            }

            res.json({
                message: "Upload jawaban siswa berhasil",
                files: saved.map(r => ({
                    id: r.id,
                    nama_file: r.file_name,
                    mime: r.file_mime,
                    url: `${req.protocol}://${req.get("host")}${r.file_jawaban_siswa}`,
                    created_at: r.created_at
                }))
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        }
    }
);



/* =========================
   SIMPAN JAWABAN (MULTIPLE)
========================= */
router.post("/", verifyToken, async (req, res) => {
    try {
        const jawabanList = req.body;
        const userId = req.users.id;

        if (!Array.isArray(jawabanList)) {
            return res.status(400).json({ message: "Answer must be an Array" });
        }

        const inserted = [];

        for (const j of jawabanList) {
            const result = await pool.query(
                `
                INSERT INTO jawaban_siswa
                    (user_id, soal_id, bank_soal_id, jawaban,
                     jawaban_essai, refleksi_siswa, file_jawaban_siswa, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
                ON CONFLICT (user_id, soal_id)
                DO UPDATE SET
                    jawaban = EXCLUDED.jawaban,
                    jawaban_essai = EXCLUDED.jawaban_essai,
                    refleksi_siswa = EXCLUDED.refleksi_siswa,
                    file_jawaban_siswa = EXCLUDED.file_jawaban_siswa,
                    created_at = NOW()
                RETURNING *
                `,
                [
                    userId,
                    j.soal_id,
                    j.bank_soal_id,
                    j.jawaban,
                    j.jawaban_essai,
                    j.refleksi_siswa,
                    j.file_jawaban_siswa || null,
                ]
            );

            inserted.push(result.rows[0]);
        }

        res.json({
            message: "Answer saved successfully",
            data: inserted,
        });
    } catch (err) {
        console.error("Error simpan jawaban:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =========================
   GET JAWABAN SISWA (LOGIN)
========================= */
router.get("/", verifyToken, async (req, res) => {
    const userId = req.users.id;

    const result = await pool.query(`
        SELECT
            id,
            soal_id,
            bank_soal_id,
            jawaban,
            jawaban_essai,
            refleksi_siswa,
            nilai,
            file_jawaban_siswa,
            file_name,
            file_mime,
            created_at
        FROM jawaban_siswa
        WHERE user_id = $1
    `, [userId]);

    res.json(result.rows.map(r => ({
        ...r,
        file_url: r.file_jawaban_siswa
            ? `${req.protocol}://${req.get("host")}${r.file_jawaban_siswa}`
            : null
    })));
});


/* =========================
   GET SEMUA JAWABAN (GURU)
========================= */
router.get("/all", verifyToken, async (req, res) => {
    try {
        const { bank_soal_id } = req.query;

        if (!bank_soal_id) {
            return res.status(400).json({ message: "bank_soal_id required" });
        }

        const result = await pool.query(
            `
            SELECT js.*, u.username, u.photo_url
            FROM jawaban_siswa js
            JOIN users u ON u.id = js.user_id
            WHERE js.bank_soal_id = $1
            `,
            [bank_soal_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetch jawaban all:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =========================
   UPDATE NILAI
========================= */
router.put("/nilai", verifyToken, async (req, res) => {
    try {
        const { user_id, bank_soal_id, nilai } = req.body;

        if (!user_id || !bank_soal_id || nilai === undefined) {
            return res.status(400).json({
                message: "user_id, bank_soal_id, nilai required",
            });
        }

        const result = await pool.query(
            `
            UPDATE jawaban_siswa
            SET nilai = $1
            WHERE user_id = $2 AND bank_soal_id = $3
            RETURNING *
            `,
            [nilai, user_id, bank_soal_id]
        );

        res.json({
            message: "Score updated sucessfully",
            data: result.rows[0],
        });
    } catch (err) {
        console.error("Error update nilai:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =========================
   GET JAWABAN + SOAL
========================= */
router.get("/all-with-soal", async (req, res) => {
    try {
        const { bank_soal_id } = req.query;

        if (!bank_soal_id) {
            return res.status(400).json({ message: "bank_soal_id wajib diisi" });
        }

        const result = await pool.query(
            `
            SELECT
                js.id AS jawaban_id,
                js.user_id,
                js.jawaban,
                js.jawaban_essai,
                js.refleksi_siswa,
                js.nilai,
                js.file_jawaban_siswa,
                sp.id AS soal_id,
                sp.pertanyaan,
                sp.pg_a,
                sp.pg_b,
                sp.pg_c,
                sp.pg_d,
                sp.pg_e,
                sp.kunci_jawaban,
                sp.gambar,
                sp.pertanyaan_essai,
                sp.gambar_soal_essai
            FROM jawaban_siswa js
            LEFT JOIN soal_pilgan sp
                ON js.soal_id = sp.id
            WHERE js.bank_soal_id = $1
            `,
            [bank_soal_id]
        );

        const data = result.rows.map(r => ({
            ...r,
            file_url: r.file_name
                ? `${req.protocol}://${req.get("host")}/api/jawaban-siswa/file-db/${r.jawaban_id}`
                : null,
        }));

        res.json(data);
    } catch (error) {
        console.error("Failed to retrieve answers and questions:", error);
        res.status(500).json({
            message: "Failed to retrieve answers and questions",
        });
    }
});

/* =========================
   STREAM FILE DARI DB
========================= */
router.get("/file-db/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const isDownload = req.query.download === "1";

        const result = await pool.query(
            `SELECT file_jawaban_siswa, file_mime, file_name
             FROM jawaban_siswa
             WHERE id = $1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).send("File not found");
        }

        const file = result.rows[0];

        // CORS (aman)
        res.setHeader("Access-Control-Allow-Origin", "*");

        res.setHeader("Content-Type", file.file_mime);

        // 🔥 INI KUNCINYA
        if (isDownload) {
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${file.file_name}"`
            );
        } else {
            res.setHeader(
                "Content-Disposition",
                `inline; filename="${file.file_name}"`
            );
        }

        res.send(file.file_jawaban_siswa);
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to load file");
    }
});

/* =========================
   REVIEW JAWABAN SISWA
========================= */
router.get("/review/:bank_soal_id", verifyToken, async (req, res) => {
    const { bank_soal_id } = req.params;
    const userId = req.users.id;

    const result = await pool.query(
        `
        SELECT
            sp.id AS soal_id,
            sp.pertanyaan,
            sp.pg_a,
            sp.pg_b,
            sp.pg_c,
            sp.pg_d,
            sp.pg_e,
            sp.kunci_jawaban,
            js.jawaban AS jawaban_siswa,
            js.jawaban_essai,
            js.refleksi_siswa
        FROM soal_pilgan sp
        LEFT JOIN jawaban_siswa js
            ON js.soal_id = sp.id
           AND js.user_id = $1
        WHERE sp.bank_soal_id = $2
        `,
        [userId, bank_soal_id]
    );

    res.json(result.rows);
});

/* =========================
   FILE BY BANK SOAL
========================= */
router.get("/files-by-bank-siswa/:bank_soal_id", verifyToken, async (req, res) => {
    const { bank_soal_id } = req.params;
    const userId = req.users.id;

    const result = await pool.query(`
        SELECT id, file_name, file_mime, file_jawaban_siswa, created_at
        FROM jawaban_siswa
        WHERE bank_soal_id = $1
          AND user_id = $2
          AND file_jawaban_siswa IS NOT NULL
        ORDER BY created_at DESC
    `, [bank_soal_id, userId]);

    res.json(result.rows.map(r => ({
        id: r.id,
        file_name: r.file_name,
        file_mime: r.file_mime,
        url: `https://${req.get("host")}/api/jawaban-siswa/file-db/${row.id}`,
        download_url: `${req.protocol}://${req.get("host")}/api/jawaban-siswa/download/${row.id}`,
        created_at: r.created_at
    })));
});


// GET FILE JAWABAN PER SOAL
router.get(
    "/files-by-soal/:bank_soal_id/:soal_id",
    verifyToken,
    async (req, res) => {
        const { bank_soal_id, soal_id } = req.params;
        const userId = req.users.id;

        const result = await pool.query(
            `
      SELECT id, soal_id, file_name, file_mime, created_at
      FROM jawaban_siswa
      WHERE bank_soal_id = $1
        AND soal_id = $2
        AND user_id = $3
        AND file_jawaban_siswa IS NOT NULL
      ORDER BY created_at DESC
      `,
            [bank_soal_id, soal_id, userId]
        );

        res.json(
            result.rows.map(row => ({
                id: row.id,
                soal_id: row.soal_id,
                nama_file: row.file_name,
                mime: row.file_mime,
                url: `https://${req.get("host")}/api/jawaban-siswa/file-db/${row.id}`,
                created_at: row.created_at,
            }))
        );
    }
);

// FILE BY BANK SOAL (GURU)
router.get("/files-by-bank-guru/:bank_soal_id", verifyToken, async (req, res) => {
    try {
        const { bank_soal_id } = req.params;

        const result = await pool.query(
            `
            SELECT id, user_id, file_name, file_mime, file_size, created_at
            FROM jawaban_siswa
            WHERE bank_soal_id = $1
              AND file_jawaban_siswa IS NOT NULL
            ORDER BY created_at DESC
            `,
            [bank_soal_id]
        );

        const files = result.rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            file_name: row.file_name,
            file_mime: row.file_mime,
            url: `https://${req.get("host")}/api/jawaban-siswa/file-db/${row.id}`,
            download_url: `${req.protocol}://${req.get("host")}/api/jawaban-siswa/download/${r.id}`,
            created_at: row.created_at,
        }));

        res.json(files);
    } catch (err) {
        console.error("Fetch files error:", err);
        res.status(500).json({ message: "Failed to fetch files" });
    }
});


/* =========================
   DELETE FILE JAWABAN SISWA
========================= */
router.delete("/file/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.users.id;

    const result = await pool.query(`
        DELETE FROM jawaban_siswa
        WHERE id = $1 AND user_id = $2
        RETURNING file_jawaban_siswa
    `, [id, userId]);

    if (!result.rowCount) {
        return res.status(404).json({ message: "Not found" });
    }

    const filePath = path.join(process.cwd(), result.rows[0].file_jawaban_siswa);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: "File deleted" });
});


/* =========================
   UPDATE FILE JAWABAN SISWA
========================= */
router.put(
    "/file/:id",
    verifyToken,
    upload.single("file"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.users.id;

            if (!req.file) {
                return res.status(400).json({ message: "File is required" });
            }

            const file = req.file;

            const result = await pool.query(
                `
                UPDATE jawaban_siswa
                SET
                    file_jawaban_siswa = $1,
                    file_mime = $2,
                    file_name = $3,
                    file_size = $4,
                    created_at = NOW()
                WHERE id = $5 AND user_id = $6
                RETURNING *
                `,
                [
                    file.buffer,
                    file.mimetype,
                    file.originalname,
                    file.buffer.length,
                    id,
                    userId
                ]
            );

            if (!result.rowCount) {
                return res.status(404).json({
                    message: "File not found or not authorized"
                });
            }

            const row = result.rows[0];

            res.json({
                message: "File updated successfully",
                file: {
                    id: row.id,
                    file_name: row.file_name,
                    file_mime: row.file_mime,
                    url: `https://${req.get("host")}/api/jawaban-siswa/file-db/${row.id}`,
                    created_at: row.created_at
                }
            });

        } catch (err) {
            console.error("Update file error:", err);
            res.status(500).json({ message: err.message });
        }
    }
);

/* =========================
   DOWNLOAD FILE JAWABAN SISWA
========================= */
router.get("/download/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.users.id;

        const result = await pool.query(
            `
            SELECT file_jawaban_siswa, file_name, file_mime
            FROM jawaban_siswa
            WHERE id = $1 AND user_id = $2
            `,
            [id, userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "File not found" });
        }

        const file = result.rows[0];
        const absolutePath = path.join(process.cwd(), file.file_jawaban_siswa);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: "File missing on server" });
        }

        res.setHeader("Content-Type", file.file_mime);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.file_name}"`
        );

        res.sendFile(absolutePath);
    } catch (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Failed to download file" });
    }
});

export default router;
