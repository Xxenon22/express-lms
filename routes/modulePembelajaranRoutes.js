import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const router = express.Router();

/* ================= MULTER SETUP ================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/materi";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${uuidv4()}.pdf`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
        file.mimetype === "application/pdf"
            ? cb(null, true)
            : cb(new Error("Only PDF allowed"));
    }
});

/* ================= GET MODULE (GURU) ================= */
router.get("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;

        const { rows } = await pool.query(
            `
            SELECT mp.*,
                   CONCAT(gl.grade_lvl,' ',mj.nama_jurusan,' ',nr.number,' - ',dm.nama_mapel) AS kelas_nama
            FROM module_pembelajaran mp
            LEFT JOIN kelas k ON k.id = mp.kelas_id
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level gl ON r.grade_id = gl.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
            LEFT JOIN db_mapel dm ON k.id_mapel = dm.id
            WHERE mp.guru_id = $1
            ORDER BY mp.created_at DESC
            `,
            [guruId]
        );

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "failed to retrieve module" });
    }
});

/* ================= POST MODULE ================= */
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const {
            judul,
            video_url,
            deskripsi,
            bank_soal_id,
            judul_penugasan,
            link_zoom,
            pass_code,
            kelas_ids
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "PDF required" });
        }

        if (!Array.isArray(kelas_ids) || !kelas_ids.length) {
            return res.status(400).json({ message: "kelas_ids required" });
        }

        const materi_uuid = uuidv4();
        const file_url = `/uploads/materi/${req.file.filename}`;
        const guru_id = req.users.id;

        for (const kelasId of kelas_ids) {
            await pool.query(
                `
                INSERT INTO module_pembelajaran
                (materi_uuid, judul, video_url, deskripsi, guru_id,
                 bank_soal_id, judul_penugasan, link_zoom,
                 kelas_id, pass_code, file_url)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                `,
                [
                    materi_uuid,
                    judul,
                    video_url,
                    deskripsi,
                    guru_id,
                    bank_soal_id,
                    judul_penugasan,
                    link_zoom,
                    kelasId,
                    pass_code,
                    file_url
                ]
            );
        }

        res.json({ message: "Material created successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ================= FAST UPDATE (NO FILE) ================= */
router.put("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { judul, video_url, deskripsi, link_zoom, pass_code, bank_soal_id } = req.body;

    const { rowCount } = await pool.query(
        `
        UPDATE module_pembelajaran
        SET judul=$1,
            video_url=$2,
            deskripsi=$3,
            link_zoom=$4,
            pass_code=$5,
            bank_soal_id=$6
        WHERE id=$7
        `,
        [judul, video_url, deskripsi, link_zoom, pass_code, bank_soal_id, id]
    );

    if (!rowCount) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Updated" });
});

/* ================= UPDATE KELAS (DELTA) ================= */
router.put("/:id/kelas", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { kelas_ids } = req.body;

    const { rows } = await pool.query(
        "SELECT materi_uuid FROM module_pembelajaran WHERE id=$1",
        [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Material not found" });

    const materi_uuid = rows[0].materi_uuid;

    const existing = await pool.query(
        "SELECT kelas_id FROM module_pembelajaran WHERE materi_uuid=$1",
        [materi_uuid]
    );

    const oldSet = new Set(existing.rows.map(r => r.kelas_id));
    const newSet = new Set(kelas_ids);

    const toDelete = [...oldSet].filter(x => !newSet.has(x));
    const toInsert = [...newSet].filter(x => !oldSet.has(x));

    await pool.query("BEGIN");

    try {
        if (toDelete.length) {
            await pool.query(
                `DELETE FROM module_pembelajaran 
                 WHERE materi_uuid=$1 AND kelas_id = ANY($2)`,
                [materi_uuid, toDelete]
            );
        }

        if (toInsert.length) {
            const template = await pool.query(
                "SELECT * FROM module_pembelajaran WHERE id=$1",
                [id]
            );

            const m = template.rows[0];

            for (const kelasId of toInsert) {
                await pool.query(
                    `
                    INSERT INTO module_pembelajaran
                    (materi_uuid, judul, video_url, deskripsi, guru_id,
                     bank_soal_id, judul_penugasan, link_zoom,
                     kelas_id, pass_code, file_url)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    `,
                    [
                        m.materi_uuid,
                        m.judul,
                        m.video_url,
                        m.deskripsi,
                        m.guru_id,
                        m.bank_soal_id,
                        m.judul_penugasan,
                        m.link_zoom,
                        kelasId,
                        m.pass_code,
                        m.file_url
                    ]
                );
            }
        }

        await pool.query("COMMIT");
        res.json({ message: "Class updated" });
    } catch (err) {
        await pool.query("ROLLBACK");
        res.status(500).json({ message: err.message });
    }
});

/* ================= GET PDF ================= */
router.get("/:id/pdf", async (req, res) => {
    const { rows } = await pool.query(
        "SELECT file_url FROM module_pembelajaran WHERE id=$1",
        [req.params.id]
    );

    if (!rows.length) return res.sendStatus(404);

    const filePath = path.join(process.cwd(), rows[0].file_url);
    if (!fs.existsSync(filePath)) return res.sendStatus(404);

    res.sendFile(filePath);
});

/* ================= DELETE BY ID ================= */
router.delete("/:id", verifyToken, async (req, res) => {
    await pool.query("DELETE FROM module_pembelajaran WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
});

/* ================= DELETE BY UUID (SEMUA KELAS) ================= */
router.delete("/uuid/:materiUuid", verifyToken, async (req, res) => {
    const { materiUuid } = req.params;
    const guruId = req.users.id;

    const result = await pool.query(
        `DELETE FROM module_pembelajaran
         WHERE materi_uuid=$1 AND guru_id=$2`,
        [materiUuid, guruId]
    );

    res.json({
        message: "Material removed from all classes",
        deleted: result.rowCount
    });
});

export default router;