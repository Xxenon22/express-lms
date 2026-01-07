import fs from "fs";
import path from "path";
import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads/materi");

async function migratePdf() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const result = await pool.query(`
        SELECT id, file_pdf
        FROM module_pembelajaran
        WHERE file_pdf IS NOT NULL
          AND file_url IS NULL
    `);

    console.log(`🔍 Found ${result.rowCount} PDF(s) to migrate`);

    for (const row of result.rows) {
        const filename = `${Date.now()}-${uuidv4()}.pdf`;
        const filePath = path.join(UPLOAD_DIR, filename);
        const publicPath = `/uploads/materi/${filename}`;

        fs.writeFileSync(filePath, row.file_pdf);

        await pool.query(
            `UPDATE module_pembelajaran
             SET file_url = $1
             WHERE id = $2`,
            [publicPath, row.id]
        );

        console.log(`✅ Migrated module ID ${row.id}`);
    }

    console.log("🎉 Migration completed successfully");
    process.exit(0);
}

migratePdf().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
