// import express from "express";
// import { pool } from "../config/db.js";
// import { verifyToken } from "../middleware/authMiddleware.js";
// import multer from "multer";
// import { v4 as uuidv4 } from "uuid";
// import path from "path";
// import fs from "fs";
// const router = express.Router();

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const dir = "uploads/materi";
//         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//         cb(null, dir);
//     },
//     filename: (req, file, cb) => {
//         const uniqueName = `${Date.now()}-${uuidv4()}.pdf`;
//         cb(null, uniqueName);
//     }
// });

// const upload = multer({
//     storage,
//     limits: { fileSize: 50 * 1024 * 1024 },
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype !== "application/pdf") {
//             cb(new Error("Only PDF allowed"), false);
//         } else {
//             cb(null, true);
//         }
//     }
// });

// // GET semua module (filter by guru_id)
// router.get("/", verifyToken, async (req, res) => {
//     try {
//         const guruId = req.users.id;

//         const result = await pool.query(
//             `
//             SELECT
//                 mp.id,
//                 mp.materi_uuid,
//                 mp.judul,
//                 mp.video_url,
//                 mp.deskripsi,
//                 mp.guru_id,
//                 mp.bank_soal_id,
//                 mp.judul_penugasan,
//                 mp.link_zoom,
//                 mp.kelas_id,
//                 mp.pass_code,
//                 mp.created_at,

//                 CONCAT(
//                     COALESCE(gl.grade_lvl, ''),
//                     ' ',
//                     COALESCE(mj.nama_jurusan, ''),
//                     ' ',
//                     COALESCE(nr.number, ''),
//                     ' - ',
//                     COALESCE(dm.nama_mapel, '')
//                 ) AS kelas_nama

//             FROM module_pembelajaran mp
//             LEFT JOIN kelas k ON k.id = mp.kelas_id
//             LEFT JOIN rombel r ON k.rombel_id = r.id
//             LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
//             LEFT JOIN grade_level gl ON r.grade_id = gl.id
//             LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
//             LEFT JOIN db_mapel dm ON k.id_mapel = dm.id

//             WHERE mp.guru_id = $1
//             ORDER BY mp.created_at DESC
//             `,
//             [guruId]
//         );

//         res.json(result.rows);
//     } catch (err) {
//         console.error("GET module pembelajaran:", err);
//         res.status(500).json({ message: "failed to retrieve module" });
//     }
// });

// // POST tambah module
// router.post("/", verifyToken, upload.single("file"), async (req, res) => {
//     try {
//         const materiUuid = uuidv4();
//         const {
//             judul,
//             video_url,
//             deskripsi,
//             guru_id,
//             bank_soal_id,
//             judul_penugasan,
//             link_zoom,
//             pass_code,
//             kelas_ids // ⬅️ ARRAY
//         } = req.body;

//         const file = req.file;

//         if (!file) {
//             return res.status(400).json({ message: "PDF file is required" });
//         }

//         if (!kelas_ids || !kelas_ids.length) {
//             return res.status(400).json({ message: "kelas_ids is required" });
//         }

//         const inserted = [];

//         for (const kelasId of Array.isArray(kelas_ids) ? kelas_ids : [kelas_ids]) {
//             const filePath = `/uploads/materi/${file.filename}`;
//             const result = await pool.query(
//                 `INSERT INTO module_pembelajaran
//                 (
//                     materi_uuid,
//                     judul,
//                     video_url,
//                     deskripsi,
//                     guru_id,
//                     bank_soal_id,
//                     judul_penugasan,
//                     link_zoom,
//                     kelas_id,
//                     pass_code,
//                     file_url
//                 )
//                 VALUES
//                 ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
//                 RETURNING id`,
//                 [
//                     materiUuid,
//                     judul,
//                     video_url,
//                     deskripsi,
//                     guru_id,
//                     bank_soal_id,
//                     judul_penugasan,
//                     link_zoom,
//                     kelasId,
//                     pass_code,
//                     filePath
//                 ]
//             );

//             inserted.push(result.rows[0]);
//         }

//         console.log("FILE RECEIVED (ONCE):", {
//             name: file.originalname,
//             size: file.size,
//             mime: file.mimetype
//         });

//         res.json({
//             message: "Material saved successfully",
//             total_kelas: inserted.length
//         });

//     } catch (err) {
//         console.error("POST module pembelajaran:", err);
//         res.status(500).json({ message: err.message });
//     }
// });


// // UPDATE materi by id
// router.put("/:id", verifyToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { judul, video_url, deskripsi, link_zoom, pass_code, bank_soal_id } = req.body;

//         const result = await pool.query(
//             `
//             UPDATE module_pembelajaran
//             SET judul=$1,
//                 video_url=$2,
//                 deskripsi=$3,
//                 link_zoom=$4,
//                 pass_code=$5,
//                 bank_soal_id=$6
//             WHERE id=$7
//             RETURNING *
//             `,
//             [judul, video_url, deskripsi, link_zoom, pass_code, bank_soal_id, id]
//         );

//         if (!result.rows.length) {
//             return res.status(404).json({ message: "Material not found" });
//         }

//         res.json(result.rows[0]);
//     } catch (err) {
//         console.error("FAST UPDATE ERROR:", err);
//         res.status(500).json({ message: "failed to update material" });
//     }
// });



// // DELETE materi by id
// router.delete("/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         await pool.query("DELETE FROM module_pembelajaran WHERE id=$1", [id]);
//         res.json({ message: "Material successfully deleted" });
//     } catch (error) {
//         console.error("DELETE /module-pembelajaran/:id", error);
//         res.status(500).json({ message: "Failed to delted material" });
//     }
// });

// // DELETE materi by materi_uuid (hapus SEMUA kelas)
// router.delete("/uuid/:materiUuid", verifyToken, async (req, res) => {
//     try {
//         const { materiUuid } = req.params;
//         const guruId = req.users.id;

//         const result = await pool.query(
//             `
//             DELETE FROM module_pembelajaran
//             WHERE materi_uuid = $1
//               AND guru_id = $2
//             `,
//             [materiUuid, guruId]
//         );

//         res.json({
//             message: "Material successfully removed from all classes",
//             deleted: result.rowCount
//         });
//     } catch (error) {
//         console.error("DELETE BY UUID ERROR:", error);
//         res.status(500).json({ message: "Failed to delete material" });
//     }
// });

// router.get("/:id/pdf", async (req, res) => {
//     try {
//         const { id } = req.params;

//         const result = await pool.query(
//             "SELECT file_url FROM module_pembelajaran WHERE id=$1",
//             [id]
//         );

//         if (!result.rows.length) {
//             return res.status(404).json({ message: "File not found" });
//         }

//         const filePath = path.join(process.cwd(), result.rows[0].file_url);

//         if (!fs.existsSync(filePath)) {
//             return res.status(404).json({ message: "PDF missing on server" });
//         }

//         res.sendFile(filePath);
//     } catch (err) {
//         console.error("PDF LOAD ERROR:", err);
//         res.status(500).json({ message: "failed to load PDF" });
//     }
// });

// // GET MATERI BY ID
// router.get("/by-id/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         const result = await pool.query(
//             `SELECT id, judul, video_url, deskripsi, guru_id, bank_soal_id,
//                     judul_penugasan, link_zoom, kelas_id, pass_code, created_at
//              FROM module_pembelajaran
//              WHERE id = $1`,
//             [id]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({ message: "Material not found" });
//         }

//         res.json(result.rows[0]); // ✅ kirim satu objek, bukan array
//     } catch (error) {
//         console.error("SELECT /module-pembelajaran/:id", error);
//         res.status(500).json({ message: "Failed to retrieve material by ID" });
//     }
// });

// // Ambil 1 module pembelajaran berdasarkan soalId
// router.get("/by-soal/:soalId", async (req, res) => {
//     try {
//         const { soalId } = req.params;
//         const result = await pool.query(
//             `SELECT
//                 mp.id,
//                 mp.kelas_id,
//                 mp.judul_penugasan,
//                 mp.created_at,
//                 bs.id AS bank_soal_id
//              FROM module_pembelajaran mp
//              LEFT JOIN bank_soal bs ON mp.bank_soal_id = bs.id
//              WHERE mp.id = $1`,
//             [soalId]
//         );

//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: "Questions not found" });
//         }

//         res.json(result.rows[0]);
//     } catch (error) {
//         console.error("Error GET /module-pembelajaran/:soalId:", error);
//         res.status(500).json({ error: "Failed to retrieve Questions" });
//     }
// });

// // GET materi history siswa
// router.get("/kelas/:kelasId/history", verifyToken, async (req, res) => {
//     const { kelasId } = req.params;
//     const userId = req.users.id;

//     const result = await pool.query(`
//         SELECT
//             m.*,
//             p.refleksi,
//             p.status_selesai
//         FROM module_pembelajaran m
//         JOIN progress_materi p
//             ON p.materi_id = m.id
//         WHERE m.kelas_id = $1
//           AND p.user_id = $2
//           AND p.status_selesai = true
//         ORDER BY p.updated_at DESC
//     `, [kelasId, userId]);

//     res.json(result.rows);
// });

// router.put("/:id/kelas", verifyToken, async (req, res) => {
//     const client = await pool.connect();

//     try {
//         const { id } = req.params;
//         const { kelas_ids } = req.body;

//         if (!Array.isArray(kelas_ids) || kelas_ids.length === 0) {
//             return res.status(400).json({
//                 message: "kelas_ids must be an array and cannot be empty"
//             });
//         }

//         await client.query("BEGIN");

//         // 1️⃣ Ambil data materi lama (sebagai template)
//         const materiRes = await client.query(
//             `SELECT * FROM module_pembelajaran WHERE id = $1`,
//             [id]
//         );

//         if (!materiRes.rows.length) {
//             await client.query("ROLLBACK");
//             return res.status(404).json({ message: "Material not found" });
//         }

//         const materi = materiRes.rows[0];

//         // 2️⃣ Hapus semua materi dengan judul & guru yang sama
//         await client.query(
//             `
//             DELETE FROM module_pembelajaran
//             WHERE judul = $1 AND guru_id = $2
//             `,
//             [materi.judul, materi.guru_id]
//         );

//         // 3️⃣ Insert ulang berdasarkan kelas baru
//         const inserted = [];

//         for (const kelasId of kelas_ids) {
//             const result = await client.query(
//                 `
//                 INSERT INTO module_pembelajaran
//                 (
//                     materi_uuid,
//                     judul,
//                     video_url,
//                     deskripsi,
//                     guru_id,
//                     bank_soal_id,
//                     judul_penugasan,
//                     link_zoom,
//                     kelas_id,
//                     pass_code,
//                     file_pdf,
//                     file_name,
//                     file_mime
//                 )
//                 VALUES
//                 ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
//                 RETURNING *
//                 `,
//                 [
//                     materi.materi_uuid,
//                     materi.judul,
//                     materi.video_url,
//                     materi.deskripsi,
//                     materi.guru_id,
//                     materi.bank_soal_id,
//                     materi.judul_penugasan,
//                     materi.link_zoom,
//                     kelasId,
//                     materi.pass_code,
//                     materi.file_pdf,
//                     materi.file_name,
//                     materi.file_mime
//                 ]
//             );

//             inserted.push(result.rows[0]);
//         }

//         await client.query("COMMIT");

//         res.json({
//             message: "Material class updated successfully",
//             total: inserted.length,
//             data: inserted
//         });

//     } catch (err) {
//         await client.query("ROLLBACK");
//         console.error("UPDATE KELAS ERROR:", err);
//         res.status(500).json({ message: "Failed to update material class" });
//     } finally {
//         client.release();
//     }
// });

// export default router;

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
        console.error(err);
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
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

/* ================= UPDATE KELAS (TANPA DELETE MASSAL) ================= */
router.put("/:id/kelas", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { kelas_ids } = req.body;

    const { rows } = await pool.query(
        "SELECT materi_uuid FROM module_pembelajaran WHERE id=$1",
        [id]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "Material not found" });
    }

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
                `SELECT * FROM module_pembelajaran WHERE id=$1`,
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
        throw err;
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
    res.sendFile(filePath);
});

/* ================= DELETE ================= */
router.delete("/:id", verifyToken, async (req, res) => {
    await pool.query("DELETE FROM module_pembelajaran WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
});

// GET semua materi untuk siswa berdasarkan kelas yang diikuti
router.get("/siswa/:userId/kelas/:kelasId", verifyToken, async (req, res) => {
    const { userId, kelasId } = req.params;

    try {
        const query = `
            SELECT
                mp.id,
                mp.judul,
                mp.video_url,
                mp.deskripsi,
                mp.judul_penugasan,
                mp.bank_soal_id,
                mp.created_at,

                p.langkah_aktif,
                p.pdf_selesai,
                p.video_selesai,
                p.status_selesai,

                u.photo_url AS guru_foto
            FROM module_pembelajaran mp
            LEFT JOIN progress_materi p
                ON p.materi_id = mp.id
            AND p.user_id = $1
            LEFT JOIN users u ON u.id = mp.guru_id
            WHERE mp.kelas_id = $2
            ORDER BY mp.created_at DESC

        `;

        const { rows } = await pool.query(query, [userId, kelasId]);
        res.json(rows);
    } catch (err) {
        console.error("Error fetch materi siswa per kelas:", err);
        res.status(500).json({ message: "Failed fetch materi" });
    }
});

// GET semua materi untuk siswa (HANYA dari kelas yang diikuti)
router.get("/siswa/:userId", verifyToken, async (req, res) => {
    const { userId } = req.params;

    try {
        const query = `
            SELECT DISTINCT
                mp.id,
                mp.materi_uuid,
                mp.judul,
                mp.video_url,
                mp.deskripsi,
                mp.judul_penugasan,
                mp.link_zoom,
                mp.bank_soal_id,
                mp.kelas_id,
                mp.guru_id,
                mp.created_at,

                p.pdf_selesai,
                p.video_selesai,

                dm.nama_mapel,
                u.photo_url AS guru_foto

            FROM module_pembelajaran mp

            JOIN kelas_diikuti ks
                ON ks.kelas_id = mp.kelas_id
               AND ks.user_id = $1

            LEFT JOIN progress_materi p
                ON p.materi_id = mp.id
               AND p.user_id = $1

            LEFT JOIN users u
                ON u.id = mp.guru_id

            LEFT JOIN kelas k
                ON k.id = mp.kelas_id

            LEFT JOIN db_mapel dm
                ON dm.id = k.id_mapel

            ORDER BY mp.created_at DESC
        `;

        const { rows } = await pool.query(query, [userId]);
        res.json(rows);

    } catch (err) {
        console.error("Error fetch materi siswa:", err);
        res.status(500).json({ message: "Failed fetch materi siswa" });
    }
});

/* ================= GET MATERI HISTORY SISWA ================= */
router.get("/kelas/:kelasId/history", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;
        const userId = req.users.id;

        const { rows } = await pool.query(
            `
            SELECT
                m.*,
                p.refleksi,
                COALESCE(p.status_selesai, false) AS status_selesai,
                p.updated_at AS selesai_at
            FROM module_pembelajaran m
            LEFT JOIN progress_materi p
                ON p.materi_id = m.id
               AND p.user_id = $2
            WHERE m.kelas_id = $1
              AND p.status_selesai = true
            ORDER BY p.updated_at DESC
            `,
            [kelasId, userId]
        );

        res.json(rows);
    } catch (err) {
        console.error("GET HISTORY ERROR:", err);
        res.status(500).json({
            message: "Failed to retrieve history material"
        });
    }
});

/* ================= FAST UPDATE (NO FILE) ================= */
router.put("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const {
        judul,
        video_url,
        deskripsi,
        link_zoom,
        pass_code,
        bank_soal_id
    } = req.body;

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


// GET materi by kelasId (hanya yang BELUM selesai)
router.get("/kelas/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;
        const userId = req.users.id;
        const guruId = req.users.id;   // guru (materi)

        const result = await pool.query(
            `
            SELECT
                m.id,
                m.judul,
                m.video_url,
                m.deskripsi,
                m.guru_id,
                m.bank_soal_id,
                m.judul_penugasan,
                m.link_zoom,
                m.kelas_id,
                m.pass_code,
                m.created_at,
                jm.status_selesai
            FROM module_pembelajaran m
            LEFT JOIN progress_materi jm
                ON jm.materi_id = m.id
               AND jm.user_id = $2
            WHERE m.kelas_id = $1
            AND m.guru_id = $3
            ORDER BY m.created_at DESC
            `,
            [kelasId, userId, guruId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET /module-pembelajaran/kelas/:kelasId", error);
        res.status(500).json({ message: "Failed retrieve Module by id" });
    }
});

router.delete("/uuid/:materiUuid", verifyToken, async (req, res) => {
    try {
        const { materiUuid } = req.params;
        const guruId = req.users.id;

        const result = await pool.query(
            `
            DELETE FROM module_pembelajaran
            WHERE materi_uuid = $1
              AND guru_id = $2
            `,
            [materiUuid, guruId]
        );

        res.json({
            message: "Material successfully removed from all classes",
            deleted: result.rowCount
        });
    } catch (error) {
        console.error("DELETE BY UUID ERROR:", error);
        res.status(500).json({ message: "Failed to delete material" });
    }
});

router.put("/:id/pdf", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "PDF file required" });
        }

        const result = await pool.query(
            `
            UPDATE module_pembelajaran
            SET file_pdf=$1,
                file_name=$2,
                file_mime=$3
            WHERE id=$4
            RETURNING id
            `,
            [file.buffer, file.originalname, file.mimetype, id]
        );

        res.json({ message: "PDF updated successfully" });
    } catch (err) {
        console.error("PDF UPDATE ERROR:", err);
        res.status(500).json({ message: "failed to update PDF" });
    }
});

export default router;