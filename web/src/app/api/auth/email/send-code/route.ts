import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const CODE_EXPIRES_MINUTES = 15;

const createTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    console.error("SMTP_HOST is not configured. Skipping real email send.");
    return null;
  }

  const secure = port === 465;

  const options: nodemailer.TransportOptions = {
    host,
    port,
    secure,
  };

  if (user && pass) {
    (options as any).auth = { user, pass };
  }

  return nodemailer.createTransport(options);
};

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, birthday } = body as {
      name?: string;
      email?: string;
      birthday?: string;
    };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const code = generateCode();
    const expires = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

    // Remove previous codes for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: code,
        expires,
      },
    });

    const transporter = createTransport();
    const from = process.env.SMTP_FROM || "no-reply@example.com";

    if (transporter) {
      const lines: string[] = [];
      if (name) {
        lines.push(`Hi ${name},`);
      } else {
        lines.push("Hi,");
      }
      lines.push("");
      lines.push(`Your verification code for Not X is: ${code}`);
      lines.push("");
      lines.push(`This code will expire in ${CODE_EXPIRES_MINUTES} minutes.`);

      await transporter.sendMail({
        from,
        to: normalizedEmail,
        subject: "Your Not-X verification code",
        text: lines.join("\n"),
        html: `<p>${lines.join("<br />")}</p>`,
      });
    } else {
      // For development: log the code so it can still be used
      console.log(`[DEV ONLY] Verification code for ${normalizedEmail}: ${code}`);
    }

    return NextResponse.json(
      {
        ok: true,
        // Expose code only in non-production to make local testing easier
        devCode: process.env.NODE_ENV !== "production" ? code : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to send verification code:", error);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}

