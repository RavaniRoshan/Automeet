import nodemailer from 'nodemailer';

// Configure nodemailer transporter
// In a real application, these would come from environment variables
const transporter = nodemailer.createTransporter({
  // This is a placeholder configuration - in a real app you'd configure this properly
  // For example, with Gmail, SendGrid, or another email service
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Sends an email using nodemailer
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  try {
    // Validate inputs
    if (!to || !subject) {
      throw new Error('Email "to" address and "subject" are required');
    }

    // Define the email options
    const mailOptions = {
      from: process.env.SMTP_FROM || 'AutoMeet <noreply@automeet.com>',
      to: to,
      subject: subject,
      text: text || html, // Fallback to HTML if text is not provided
      html: html
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully to ${to}:`, info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Validates an email address format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sends a test email
 */
export async function sendTestEmail(to: string): Promise<void> {
  const subject = 'AutoMeet Test Email';
  const htmlContent = `
    <html>
      <body>
        <h2>AutoMeet Test Email</h2>
        <p>This is a test email from your AutoMeet application.</p>
        <p>If you received this, your email configuration is working correctly.</p>
        <p>Best regards,<br/>The AutoMeet Team</p>
      </body>
    </html>
  `;
  
  const textContent = 'This is a test email from your AutoMeet application. If you received this, your email configuration is working correctly.';
  
  await sendEmail(to, subject, htmlContent, textContent);
}