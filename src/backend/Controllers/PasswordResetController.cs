using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;
using VolleyballSystem.API.Services;
using BCrypt.Net;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PasswordResetController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly EmailService _emailService;

        public PasswordResetController(ApplicationDbContext context, EmailService emailService)
        {
            _context      = context;
            _emailService = emailService;
        }

        // POST api/passwordreset/forgot
        [HttpPost("forgot")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            // Auditoria
            _context.AuditLogs.Add(new AuditLog
            {
                Action  = "RESET_REQUEST",
                Email   = request.Email,
                Success = user != null,
                Details = user != null ? "Reset email sent" : "Email not found"
            });
            await _context.SaveChangesAsync();

            // Sempre retorna 200 para não revelar se o e-mail existe
            if (user == null)
                return Ok(new { message = "If this email exists, a reset link has been sent." });

            // Invalida tokens anteriores
            var oldTokens = await _context.PasswordResetTokens
                .Where(t => t.UserId == user.Id && !t.Used)
                .ToListAsync();
            oldTokens.ForEach(t => t.Used = true);

            // Cria novo token
            var token = Guid.NewGuid().ToString("N");
            _context.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId    = user.Id,
                Token     = token,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            });
            await _context.SaveChangesAsync();

            // Envia e-mail
            var resetLink = $"http://localhost:5500/src/frontend/pages/reset-password.html?token={token}";
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.Name, resetLink);

            return Ok(new { message = "If this email exists, a reset link has been sent." });
        }

        // POST api/passwordreset/reset
        [HttpPost("reset")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var tokenEntry = await _context.PasswordResetTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Token == request.Token && !t.Used);

            if (tokenEntry == null || tokenEntry.ExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Invalid or expired token." });
            }

            // Atualiza a senha
            tokenEntry.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            tokenEntry.Used = true;

            // Auditoria
            _context.AuditLogs.Add(new AuditLog
            {
                Action  = "RESET_SUCCESS",
                Email   = tokenEntry.User.Email,
                Success = true,
                Details = "Password reset successfully"
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully. You can now login." });
        }
    }
}
