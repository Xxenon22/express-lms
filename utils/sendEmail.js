import nodemailer from "nodemailer";

export default async function sendEmail({ to, subject, text }) {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 2525,
            secure: false,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000,
            family: 4
        });

        const info = await transporter.sendMail({
            from: `"MILS" <${process.env.EMAIL}>`,
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
