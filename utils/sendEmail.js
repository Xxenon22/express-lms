import nodemailer from "nodemailer";

export default async function sendEmail({ to, subject, text }) {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"MILES" <${process.env.EMAIL}>`,
            to,
            subject,
            text,
        });

        console.log("Email sent:", info.response);
        return info;

    } catch (error) {
        console.error("SEND EMAIL ERROR:", error.message);
        throw error;
    }
}
