const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return _transporter;
}

async function sendResultsEmail({
  studentName,
  studentEmail,
  quizTitle,
  score,
  maxScore,
  percentage,
  passed,
  passingScore,
  submissionId,
  clientUrl
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[Email] No credentials configured — skipping result email to ${studentEmail}`);
    return { skipped: true };
  }

  const statusColor = passed ? '#2D8A4E' : '#C0392B';
  const statusLabel = passed ? 'PASSED' : 'FAILED';
  const resultUrl   = `${clientUrl}/student/result/${submissionId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#C0724A;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:.02em;">Exétasi</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Quiz Results Available</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;">Hi <strong>${studentName}</strong>,</p>
      <p style="margin:0 0 24px;color:#444;font-size:14px;">
        Your tutor has released the results for <strong>"${quizTitle}"</strong>.
        Here is a summary of how you did:
      </p>
      <div style="background:#fdf7f4;border:1px solid #f0d9ca;border-radius:12px;padding:24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#666;font-weight:600;">Score</td>
            <td style="padding:6px 0;color:#1a1a1a;font-weight:700;text-align:right;">${score} / ${maxScore} pts &nbsp;(${percentage}%)</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-weight:600;">Result</td>
            <td style="padding:6px 0;font-weight:700;text-align:right;">
              <span style="color:${statusColor};">${statusLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;font-weight:600;">Pass mark</td>
            <td style="padding:6px 0;color:#1a1a1a;font-weight:700;text-align:right;">${passingScore}%</td>
          </tr>
        </table>
      </div>
      <a href="${resultUrl}"
         style="display:inline-block;background:#C0724A;color:#fff;padding:13px 28px;border-radius:10px;
                text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.01em;">
        View Full Results →
      </a>
      <p style="margin:32px 0 0;font-size:12px;color:#aaa;">
        Exétasi Quiz Platform &nbsp;·&nbsp; This email was sent automatically when your tutor released results.
      </p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Exétasi" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Your results for "${quizTitle}" are now available`,
    html
  });

  return { sent: true };
}

module.exports = { sendResultsEmail };
