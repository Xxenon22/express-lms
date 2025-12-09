import nodemailer from "nodemailer";

export default async function sendEmail({ to, subject, code }) {
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

        // Gunakan HTML agar email terlihat lebih baik
        const htmlContent = `
            <div style="font-family: sans-serif; font-size: 16px;">
                <p>Hello,</p>
                <p>Your verification code is:</p>
                <h2 style="color: #2e6de3;">${code}</h2>
                <p>This code will expire in 10 minutes.</p>
                <p>Thank you!</p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: `"MILS" <${process.env.EMAIL}>`,
            to,
            subject,
            text: `Your verification code is: ${code}`, // fallback text
            html: htmlContent
        });

        console.log("Email sent:", info.response);
        return info;

    } catch (error) {
        console.error("SEND EMAIL ERROR:", error.message);
        throw error;
    }
}
