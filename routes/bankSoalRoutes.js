import express from "express";
import { buatPenugasanBaru, getPenugasan, deleteData, updatePenugasan } from "../controllers/bankSoalController.js";

const router = express.Router();

router.get("/", getPenugasan);          // ambil daftar penugasan
router.post("/", buatPenugasanBaru);    // tambah penugasan baru
router.put("/:id", updatePenugasan);    // update penugasan
router.delete("/:id", deleteData)

export default router;
