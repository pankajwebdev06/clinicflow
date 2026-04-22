import twilio from "twilio";

interface SmsResult {
  success: boolean;
  message: string;
  error?: string;
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function sendSms(mobile: string, otp: string): Promise<SmsResult> {
  const client = getClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    console.warn("[SMS] Twilio credentials not set — OTP not sent. Dev OTP:", otp);
    return { success: false, message: "SMS credentials not configured", error: "NO_CREDS" };
  }

  try {
    await client.messages.create({
      body: `Your ClinicFlow OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: fromNumber,
      to: `+91${mobile}`,
    });
    console.info("[SMS] OTP sent successfully to +91" + mobile);
    return { success: true, message: "OTP sent via SMS" };
  } catch (err: any) {
    console.error("[SMS] Twilio error:", err.message, "code:", err.code);
    return {
      success: false,
      message: err.message ?? "SMS delivery failed",
      error: String(err.code ?? "TWILIO_ERR"),
    };
  }
}

export async function sendWhatsApp(mobile: string, otp: string): Promise<SmsResult> {
  const client = getClient();
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

  if (!client) {
    console.warn("[WhatsApp] Twilio credentials not set — OTP not sent. Dev OTP:", otp);
    return { success: false, message: "WhatsApp credentials not configured", error: "NO_CREDS" };
  }

  try {
    await client.messages.create({
      body: `Your *ClinicFlow* OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this code.`,
      from: whatsappFrom,
      to: `whatsapp:+91${mobile}`,
    });
    console.info("[WhatsApp] OTP sent successfully to +91" + mobile);
    return { success: true, message: "OTP sent via WhatsApp" };
  } catch (err: any) {
    console.error("[WhatsApp] Twilio error:", err.message, "code:", err.code);
    return {
      success: false,
      message: err.message ?? "WhatsApp delivery failed",
      error: String(err.code ?? "TWILIO_ERR"),
    };
  }
}
