import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL = process.env.GMAIL_USER || 'mikeokpechi@gmail.com';
const SENDER_NAME = 'Landview Buyback';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

async function send(payload: {
  to: string | string[];
  cc?: string;
  subject: string;
  html: string;
}): Promise<void> {
  const toList = Array.isArray(payload.to)
    ? payload.to.map(e => ({ email: e }))
    : [{ email: payload.to }];

  const body: any = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: toList,
    subject: payload.subject,
    htmlContent: payload.html,
  };

  if (payload.cc) {
    body.cc = [{ email: payload.cc }];
  }

  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', body, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    const detail = err?.response?.data?.message || err?.message || String(err);
    throw new Error(detail);
  }
}

interface InvestmentEmailData {
  clientName: string;
  clientEmail: string;
  realtorEmail?: string;
  plotNumber: string;
  principal: number;
  maturityAmount: number;
  maturityDate: Date;
  interestRate: number;
  roiAmount: number;
}

export async function sendMaturityReminderEmail(data: {
  clientName: string;
  clientEmail: string;
  realtorEmail?: string;
  plotNumber: string;
  principal: number;
  maturityAmount: number;
  maturityDate: Date;
  interestRate: number;
  responseUrl: string;
}): Promise<void> {
  const daysLeft = Math.ceil((data.maturityDate.getTime() - Date.now()) / 86400000);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align:center;">
        <h1 style="margin: 0; font-size: 22px;">Your Investment is Maturing Soon</h1>
        <p style="margin: 8px 0 0; opacity: 0.8;">Landview Property Investments Limited</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>Your investment is maturing in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on <strong>${formatDate(data.maturityDate)}</strong>. We want to make sure you are ready and ask what you would like to do.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f5f5;"><td style="padding:10px;border:1px solid #ddd;"><strong>Plot Number</strong></td><td style="padding:10px;border:1px solid #ddd;">${data.plotNumber}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Principal</strong></td><td style="padding:10px;border:1px solid #ddd;">${formatCurrency(data.principal)}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:10px;border:1px solid #ddd;"><strong>Interest Rate</strong></td><td style="padding:10px;border:1px solid #ddd;">${data.interestRate}%</td></tr>
          <tr style="background:#e8f4fd;"><td style="padding:10px;border:1px solid #ddd;"><strong>Total at Maturity</strong></td><td style="padding:10px;border:1px solid #ddd;font-size:1.2em;color:#1e3a5f;"><strong>${formatCurrency(data.maturityAmount)}</strong></td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Maturity Date</strong></td><td style="padding:10px;border:1px solid #ddd;">${formatDate(data.maturityDate)}</td></tr>
        </table>
        <p style="color:#444;">Would you like to <strong>extend your investment</strong> for another term, receive a <strong>partial payout</strong> and reinvest the rest, or simply <strong>collect your full payout</strong> at maturity?</p>
        <div style="text-align:center; margin: 30px 0;">
          <a href="${data.responseUrl}" style="background:#1e3a5f;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
            Let Us Know Your Decision →
          </a>
        </div>
        <p style="color:#888;font-size:12px;">Or copy this link: <a href="${data.responseUrl}" style="color:#1e3a5f;">${data.responseUrl}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#666;font-size:13px;">If you have any questions, please contact us or visit our office at Road 12, Block 10B, Plot 8, Lekki Scheme II, Ajah, Lagos.</p>
        <p style="margin-top: 20px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;

  await send({
    to: data.clientEmail,
    ...(data.realtorEmail ? { cc: data.realtorEmail } : {}),
    subject: `Action Required: Your Investment Matures in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''} — Plot ${data.plotNumber}`,
    html,
  });
}

export async function sendMaturityNotification(data: InvestmentEmailData): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Landview Investment Maturity Notice</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>Your land investment buyback agreement has reached its maturity date. Please find the details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Plot Number</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data.plotNumber}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Principal Amount</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(data.principal)}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Interest Rate</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data.interestRate}%</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>ROI Amount</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(data.roiAmount)}</td></tr>
          <tr style="background: #e8f4fd;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Maturity Amount</strong></td><td style="padding: 10px; border: 1px solid #ddd; font-size: 1.2em; color: #1e3a5f;"><strong>${formatCurrency(data.maturityAmount)}</strong></td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Maturity Date</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatDate(data.maturityDate)}</td></tr>
        </table>
        <p>Our team will contact you shortly to arrange payment. If you have any questions, please don't hesitate to reach out.</p>
        <p style="margin-top: 30px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;

  await send({
    to: data.clientEmail,
    ...(data.realtorEmail ? { cc: data.realtorEmail } : {}),
    subject: `Investment Maturity Notice - Plot ${data.plotNumber}`,
    html,
  });
}

export async function sendExtensionConfirmation(data: {
  clientName: string;
  clientEmail: string;
  plotNumber: string;
  newMaturityDate: Date;
  newDuration: string;
  newInterestRate: number;
  newMaturityAmount: number;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Investment Extension Confirmation</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>Your investment extension has been processed successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Plot Number</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data.plotNumber}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Additional Duration</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data.newDuration}</td></tr>
          <tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>New Maturity Date</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatDate(data.newMaturityDate)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>New Interest Rate</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data.newInterestRate}%</td></tr>
          <tr style="background: #e8f4fd;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>New Maturity Amount</strong></td><td style="padding: 10px; border: 1px solid #ddd;"><strong>${formatCurrency(data.newMaturityAmount)}</strong></td></tr>
        </table>
        <p style="margin-top: 30px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;

  await send({
    to: data.clientEmail,
    subject: `Investment Extension Confirmed - Plot ${data.plotNumber}`,
    html,
  });
}

export async function sendPaymentCompletion(data: {
  clientName: string;
  clientEmail: string;
  plotNumber: string;
  amountPaid: number;
  completedDate: Date;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Payment Completed!</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>We are pleased to confirm that your buyback payment has been completed successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Plot Number</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data.plotNumber}</td></tr>
          <tr style="background: #dcfce7;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td><td style="padding: 10px; border: 1px solid #ddd; font-size: 1.2em; color: #16a34a;"><strong>${formatCurrency(data.amountPaid)}</strong></td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Date</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${formatDate(data.completedDate)}</td></tr>
        </table>
        <p>Thank you for trusting Landview with your investment. We hope to work with you again in the future.</p>
        <p style="margin-top: 30px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;

  await send({
    to: data.clientEmail,
    subject: `Payment Completed - Plot ${data.plotNumber}`,
    html,
  });
}

export async function sendApplicationSubmissionEmail(data: {
  clientName: string;
  clientEmail: string;
  applicationId: string;
  principal: number;
  duration: string;
  statusUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Application Received!</h1>
        <p style="margin: 8px 0 0; opacity: 0.8;">Landview Property Investments Limited</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>Thank you for submitting your investment application with Landview Property Investments Limited. We have received your application and our team will review it shortly.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f5f5;"><td style="padding:10px;border:1px solid #ddd;"><strong>Application ID</strong></td><td style="padding:10px;border:1px solid #ddd; font-family: monospace;">${data.applicationId}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Principal Amount</strong></td><td style="padding:10px;border:1px solid #ddd;">${formatCurrency(data.principal)}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:10px;border:1px solid #ddd;"><strong>Duration</strong></td><td style="padding:10px;border:1px solid #ddd;">${data.duration}</td></tr>
        </table>
        <p>You can track the status of your application at any time using the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.statusUrl}" style="background:#1e3a5f;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
            Track My Application →
          </a>
        </div>
        <p style="color:#888;font-size:12px;">Or copy this link: <a href="${data.statusUrl}" style="color:#1e3a5f;">${data.statusUrl}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#666;font-size:13px;">If you have any questions, please visit our office at Road 12, Block 10B, Plot 8, Lekki Scheme II, Ajah, Lagos, or call us directly.</p>
        <p style="margin-top: 20px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;
  await send({ to: data.clientEmail, subject: 'Application Received — Landview Investment Registration', html });
}

export async function sendApplicationRejectionEmail(data: {
  clientName: string;
  clientEmail: string;
  applicationId: string;
  reason?: string;
  statusUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #dc2626; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Application Update</h1>
        <p style="margin: 8px 0 0; opacity: 0.85;">Landview Property Investments Limited</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>We regret to inform you that your investment application (ID: <strong>${data.applicationId}</strong>) has not been approved at this time.</p>
        ${data.reason ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#991b1b;"><strong>Reason:</strong> ${data.reason}</p>
        </div>` : ''}
        <p>You are welcome to update your application and resubmit. Use the link below to view and edit your application:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.statusUrl}" style="background:#1e3a5f;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
            View & Update Application →
          </a>
        </div>
        <p style="color:#888;font-size:12px;">Or copy this link: <a href="${data.statusUrl}" style="color:#1e3a5f;">${data.statusUrl}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#666;font-size:13px;">If you believe this is an error or would like to discuss further, please visit our office at Road 12, Block 10B, Plot 8, Lekki Scheme II, Ajah, Lagos.</p>
        <p style="margin-top: 20px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;
  await send({ to: data.clientEmail, subject: 'Investment Application Update — Landview Properties', html });
}

export async function sendApplicationApprovedEmail(data: {
  clientName: string;
  clientEmail: string;
  plotNumber: string;
  principal: number;
  maturityAmount: number;
  maturityDate: Date;
  duration: string;
  interestRate: number;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #16a34a; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Congratulations — Investment Activated!</h1>
        <p style="margin: 8px 0 0; opacity: 0.85;">Landview Property Investments Limited</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Dear <strong>${data.clientName}</strong>,</p>
        <p>We are pleased to confirm that your investment application has been <strong>approved and activated</strong>. Welcome to the Landview Buyback Investment Programme!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background:#f5f5f5;"><td style="padding:10px;border:1px solid #ddd;"><strong>Plot Number</strong></td><td style="padding:10px;border:1px solid #ddd;">${data.plotNumber || '—'}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Principal Invested</strong></td><td style="padding:10px;border:1px solid #ddd;">${formatCurrency(data.principal)}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:10px;border:1px solid #ddd;"><strong>Duration</strong></td><td style="padding:10px;border:1px solid #ddd;">${data.duration}</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Interest Rate</strong></td><td style="padding:10px;border:1px solid #ddd;">${data.interestRate}%</td></tr>
          <tr><td style="padding:10px;border:1px solid #ddd;"><strong>Maturity Date</strong></td><td style="padding:10px;border:1px solid #ddd;">${formatDate(data.maturityDate)}</td></tr>
          <tr style="background:#dcfce7;"><td style="padding:10px;border:1px solid #ddd;"><strong>Total at Maturity</strong></td><td style="padding:10px;border:1px solid #ddd;font-size:1.2em;color:#16a34a;"><strong>${formatCurrency(data.maturityAmount)}</strong></td></tr>
        </table>
        <p>Our team will reach out as your investment approaches its maturity date. We look forward to a successful partnership.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#666;font-size:13px;">For any enquiries, visit our office at Road 12, Block 10B, Plot 8, Lekki Scheme II, Ajah, Lagos.</p>
        <p style="margin-top: 20px; color: #666;">Best regards,<br><strong>Landview Investment Team</strong></p>
      </div>
    </div>
  `;
  await send({ to: data.clientEmail, subject: 'Investment Activated — Welcome to Landview Buyback Programme', html });
}

export async function sendOtpEmail(data: {
  to: string;
  name: string;
  code: string;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">Verification Code</h1>
        <p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Landview Buyback — Admin Portal</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; text-align: center;">
        <p style="color: #444; font-size: 15px;">Hi <strong>${data.name}</strong>, here is your one-time login code:</p>
        <div style="margin: 28px auto; display: inline-block; background: #f0f4ff; border: 2px solid #1e3a5f; border-radius: 12px; padding: 20px 40px;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 10px; color: #1e3a5f; font-family: monospace;">${data.code}</span>
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 20px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color: #aaa; font-size: 12px; margin-top: 16px;">If you did not attempt to log in, contact your system administrator immediately.</p>
      </div>
    </div>
  `;
  await send({ to: data.to, subject: `${data.code} — Your Landview Login Code`, html });
}

export async function sendPasswordResetEmail(data: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">Reset Your Password</h1>
        <p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Landview Buyback — Admin Portal</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Hi <strong>${data.name}</strong>,</p>
        <p style="color: #444;">A password reset was requested for your account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background: #1e3a5f; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
            Reset Password →
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">Or copy this link: <a href="${data.resetUrl}" style="color: #1e3a5f;">${data.resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
      </div>
    </div>
  `;
  await send({ to: data.to, subject: 'Reset your password — Landview Buyback', html });
}

export async function sendWelcomeEmail(data: {
  to: string;
  name: string;
  tempPassword: string;
  loginUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #1e3a5f; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 20px;">Welcome to Landview Buyback</h1>
        <p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Admin Portal Access</p>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        <p>Hi <strong>${data.name}</strong>,</p>
        <p style="color: #444;">An account has been created for you on the Landview Buyback Investment Management System. Your temporary credentials are below — please log in and change your password immediately.</p>
        <div style="background: #f0f4ff; border: 1px solid #c7d7f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #666;"><strong>Temporary Password:</strong></p>
          <p style="margin: 0; font-size: 22px; font-family: monospace; letter-spacing: 2px; color: #1e3a5f; font-weight: bold;">${data.tempPassword}</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${data.loginUrl}" style="background: #1e3a5f; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold; display: inline-block;">
            Log In Now →
          </a>
        </div>
        <p style="color: #dc2626; font-size: 13px; font-weight: bold;">⚠ Change your password immediately after first login. Do not share these credentials.</p>
      </div>
    </div>
  `;
  await send({ to: data.to, subject: 'Your Landview Buyback Account — Login Details', html });
}

export async function sendDailyPaymentDueList(superAdminEmails: string[], investments: any[]): Promise<void> {
  if (!investments.length || !superAdminEmails.length) return;

  const rows = investments.map(inv => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${inv.clientName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${inv.plotNumber}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(Number(inv.maturityAmount))}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${inv.clientEmail || 'N/A'}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Daily Payment Due List</h1>
        <p style="margin: 5px 0 0; opacity: 0.8;">${formatDate(new Date())}</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
        <p><strong>${investments.length}</strong> investment(s) are maturing today:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e3a5f; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Client</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Plot</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Amount Due</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Email</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  await send({
    to: superAdminEmails,
    subject: `Daily Payment Due List - ${investments.length} Investment(s) Maturing Today`,
    html,
  });
}

export async function sendWeeklyReminder(adminEmails: string[], maturingThisWeek: any[], pendingPayments: any[]): Promise<void> {
  if (!adminEmails.length) return;

  const rows = maturingThisWeek.map(inv => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${inv.clientName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${inv.plotNumber}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(inv.maturityDate)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(Number(inv.maturityAmount))}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Weekly Investment Summary</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1e3a5f;">Investments Maturing This Week (${maturingThisWeek.length})</h2>
        ${maturingThisWeek.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr style="background: #1e3a5f; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align:left;">Client</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align:left;">Plot</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align:left;">Maturity Date</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align:left;">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>` : '<p style="color:#666;">No investments maturing this week.</p>'}
        <h2 style="color: #1e3a5f; margin-top: 30px;">Pending Payments (${pendingPayments.length})</h2>
        <p style="color:#666;">${pendingPayments.length} investment(s) have payment initiated but not yet completed.</p>
      </div>
    </div>
  `;

  await send({
    to: adminEmails,
    subject: `Weekly Investment Summary - ${maturingThisWeek.length} Maturing This Week`,
    html,
  });
}
