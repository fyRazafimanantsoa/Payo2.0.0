const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface GenerateEmailBodyParams {
  invoiceNumber: string;
  amount: string;
  dueDate: string;
}

/**
 * Generate a professional reminder email body using OpenRouter AI.
 * Uses the model specified in OPENROUTER_MODEL env variable.
 */
export async function generateOverdueEmailBody(
  params: GenerateEmailBodyParams
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";

  const systemPrompt =
    "You are a professional accounts receivable agent. Write a firm but polite email reminding the client that invoice {invoice_number} for {amount} was due on {due_date}. Ask them to pay immediately. Write only the main body text of the email. Do not include subject lines, greetings, or sign-offs.";

  const userPrompt = `Write a payment reminder email body for:
- Invoice Number: ${params.invoiceNumber}
- Amount: ${params.amount}
- Due Date: ${params.dueDate}

The email should be firm but professional, reminding the client that payment is overdue and requesting immediate payment.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from OpenRouter");
  }

  return content.trim();
}

/**
 * Wrap AI-generated email text in a professional HTML template.
 * Includes "Powered by Payo" footer.
 */
export function wrapEmailInTemplate(aiBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #8B4513; padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 600; }
    .content { padding: 40px 32px; color: #1f2937; font-size: 16px; line-height: 1.6; }
    .content p { margin: 0 0 16px 0; }
    .footer { padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer a { color: #9CA3AF; font-size: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payo</h1>
    </div>
    <div class="content">
      ${aiBody
        .split("\n")
        .map((line) => `<p>${line}</p>`)
        .join("\n      ")}
    </div>
    <div class="footer">
      <a href="#">Powered by Payo</a>
    </div>
  </div>
</body>
</html>`;
}
