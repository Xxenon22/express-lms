import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    console.log("Authorization header:", authHeader);

    if (!authHeader) {
        return res.status(403).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // ambil token setelah Bearer
    if (!token) {
        return res.status(403).json({ message: "Token missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded user:", decoded);
        req.users = decoded; // simpan ke request
        next();
    } catch (err) {
        console.error("JWT verify error:", err.message);
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};
