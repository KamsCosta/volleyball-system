using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Services
{
    public class AuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public AuthService(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config  = config;
        }

        public async Task<User> RegisterUser(SignUpRequest model)
        {
            var exists = await _context.Users
                .AnyAsync(u => u.Email == model.Email);

            if (exists)
            {
                // Auditoria
                _context.AuditLogs.Add(new AuditLog
                {
                    Action  = "SIGNUP",
                    Email   = model.Email,
                    Success = false,
                    Details = "Email already in use"
                });
                await _context.SaveChangesAsync();
                throw new InvalidOperationException("Email already in use.");
            }

            var user = new User
            {
                Name         = model.Name,
                Email        = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                CreatedAt    = DateTime.UtcNow
            };

            _context.Users.Add(user);

            // Auditoria
            _context.AuditLogs.Add(new AuditLog
            {
                Action  = "SIGNUP",
                Email   = model.Email,
                Success = true,
                Details = "Account created successfully"
            });

            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<UserLoginResponse> LoginUser(LoginRequest model)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == model.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
            {
                // Auditoria
                _context.AuditLogs.Add(new AuditLog
                {
                    Action  = "LOGIN",
                    Email   = model.Email,
                    Success = false,
                    Details = "Invalid credentials"
                });
                await _context.SaveChangesAsync();
                throw new InvalidOperationException("Invalid email or password.");
            }

            var token = GenerateJwtToken(user);

            // Auditoria
            _context.AuditLogs.Add(new AuditLog
            {
                Action  = "LOGIN",
                Email   = model.Email,
                Success = true,
                Details = "Login successful"
            });
            await _context.SaveChangesAsync();

            return new UserLoginResponse
            {
                Id    = user.Id,
                Name  = user.Name,
                Email = user.Email,
                Token = token
            };
        }

        private string GenerateJwtToken(User user)
        {
            var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("sub",   user.Id.ToString()),
                new Claim("email", user.Email),
                new Claim("name",  user.Name)
            };

            var token = new JwtSecurityToken(
                issuer:             _config["Jwt:Issuer"],
                audience:           _config["Jwt:Audience"],
                claims:             claims,
                expires:            DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class UserLoginResponse
    {
        public int    Id    { get; set; }
        public string Name  { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
