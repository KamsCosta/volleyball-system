using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.Services;
using VolleyballSystem.API.DTO;
using Microsoft.AspNetCore.Authorization;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ApplicationDbContext _context;

        public AuthController(AuthService authService, ApplicationDbContext context)
        {
            _authService = authService;
            _context     = context;
        }

        // POST api/auth/signup
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var user = await _authService.RegisterUser(model);
                return StatusCode(201, new { id = user.Id, email = user.Email, message = "Conta criada com sucesso!" });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var response = await _authService.LoginUser(model);
                return Ok(new { id = response.Id, name = response.Name, email = response.Email, token = response.Token, message = "Login realizado com sucesso!" });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET api/auth/me — dados do usuário logado
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var idClaim = User.FindFirst("sub")?.Value;
            if (idClaim == null) return Unauthorized();

            var user = await _context.Users
                .Where(u => u.Id == int.Parse(idClaim))
                .Select(u => new { u.Id, u.Name, u.Email, u.IsActive, u.CreatedAt,
                    TestsApplied = _context.Tests.Count(t => t.CoachId == u.Id) })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound();
            return Ok(user);
        }

        // PUT api/auth/me — atualiza nome e email
        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var idClaim = User.FindFirst("sub")?.Value;
            if (idClaim == null) return Unauthorized();

            var user = await _context.Users.FindAsync(int.Parse(idClaim));
            if (user == null) return NotFound();

            // Verifica se o novo email já existe em outro usuário
            var emailTaken = await _context.Users
                .AnyAsync(u => u.Email == request.Email && u.Id != user.Id);

            if (emailTaken)
                return BadRequest(new { message = "Email already in use." });

            user.Name  = request.Name;
            user.Email = request.Email;

            _context.AuditLogs.Add(new Models.AuditLog
            {
                Action  = "PROFILE_UPDATE",
                Email   = user.Email,
                Success = true,
                Details = "Profile updated"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully.", name = user.Name, email = user.Email });
        }

        // PUT api/auth/me/password — atualiza senha
        [Authorize]
        [HttpPut("me/password")]
        public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var idClaim = User.FindFirst("sub")?.Value;
            if (idClaim == null) return Unauthorized();

            var user = await _context.Users.FindAsync(int.Parse(idClaim));
            if (user == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            _context.AuditLogs.Add(new Models.AuditLog
            {
                Action  = "PASSWORD_CHANGE",
                Email   = user.Email,
                Success = true,
                Details = "Password changed successfully"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Password updated successfully." });
        }

        // GET api/auth/users — lista todos os coaches
        [Authorize]
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.Name, u.Email, u.IsActive, u.CreatedAt,
                    TestsApplied = _context.Tests.Count(t => t.CoachId == u.Id) })
                .OrderBy(u => u.Name)
                .ToListAsync();
            return Ok(users);
        }

        // GET api/auth/users/{id}
        [Authorize]
        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users
                .Where(u => u.Id == id)
                .Select(u => new { u.Id, u.Name, u.Email, u.IsActive, u.CreatedAt })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { message = "Coach not found." });

            var tests = await _context.Tests
                .Include(t => t.Player)
                .Where(t => t.CoachId == id)
                .OrderByDescending(t => t.TestDate)
                .Select(t => new {
                    t.Id, PlayerName = t.Player.Name, t.Category,
                    t.Classification, t.TotalHits,
                    HitRate = Math.Round((double)t.TotalHits / 160 * 100, 1), t.TestDate
                })
                .ToListAsync();

            return Ok(new { coach = user, tests });
        }

        // PATCH api/auth/users/{id}/toggle
        [Authorize]
        [HttpPatch("users/{id}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Coach not found." });
            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { message = user.IsActive ? "Coach activated." : "Coach deactivated.", isActive = user.IsActive });
        }

        // DELETE api/auth/users/{id}
        [Authorize]
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Coach not found." });
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Coach deleted successfully." });
        }

        [Authorize]
        [HttpGet("protected")]
        public IActionResult ProtectedRoute() => Ok(new { message = "Acesso permitido!" });

        [Authorize]
        [HttpGet("test")]
        public IActionResult TestToken() => Ok(new {
            message = "Valid token! 🎉",
            user = new { Id = User.FindFirst("sub")?.Value, Email = User.FindFirst("email")?.Value, Name = User.FindFirst("name")?.Value }
        });
    }
}
