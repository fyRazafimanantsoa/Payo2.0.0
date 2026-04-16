import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface SendEmailOptions {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend.
 * Falls back to console logging in development if no API key is configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const fromEmail = options.from || process.env.FROM_EMAIL || "Payo <noreply@payo.app>";

  // Development mode: log to console if no API key
  if (!resend) {
    console.log("=== EMAIL (Development Mode) ===");
    console.log(`To: ${options.to}`);
    if (options.cc && options.cc.length > 0) {
      console.log(`CC: ${options.cc.join(", ")}`);
    }
    console.log(`Subject: ${options.subject}`);
    console.log(`From: ${fromEmail}`);
    console.log(`HTML Body (first 500 chars): ${options.html.substring(0, 500)}...`);
    console.log("================================");
    return {
      success: true,
      messageId: "dev-mode-" + Date.now().toString(),
    };
  }

  try {
    const ccEmails = options.cc && options.cc.length > 0 ? options.cc : undefined;

    const data = await resend.emails.send({
      from: fromEmail,
      to: [options.to],
      cc: ccEmails,
      subject: options.subject,
      html: options.html,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageId = (data as any).id || (data as any).data?.id;
    return {
      success: true,
      messageId: messageId as string,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email error";
    console.error("Failed to send email:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
