using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace VolleyballSystem.API.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string userName, string resetLink)
        {
            var fromEmail = _config["Email:From"];
            var password  = _config["Email:Password"];

            var smtp = new SmtpClient("smtp.gmail.com")
            {
                Port = 587,
                Credentials = new NetworkCredential(fromEmail, password),
                EnableSsl = true
            };

            var mail = new MailMessage
            {
                From       = new MailAddress(fromEmail, "Volleyball Performance"),
                Subject    = "Reset your password",
                IsBodyHtml = true,
                Body       = $@"
                    <div style='font-family:Arial,sans-serif;max-width:500px;margin:0 auto;'>
                        <h2 style='color:#4e8fff;'>Password Reset</h2>
                        <p>Hi <strong>{userName}</strong>,</p>
                        <p>You requested a password reset. Click the button below to set a new password:</p>
                        <a href='{resetLink}'
                           style='display:inline-block;padding:12px 24px;background:#4e8fff;color:white;
                                  text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;'>
                            Reset Password
                        </a>
                        <p style='color:#888;font-size:12px;'>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                    </div>"
            };

            mail.To.Add(toEmail);
            await smtp.SendMailAsync(mail);
        }
    }
}
