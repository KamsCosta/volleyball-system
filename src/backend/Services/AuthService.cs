using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.Models;
using VolleyballSystem.API.DTO;

namespace VolleyballSystem.API.Services
{
    public class AuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public AuthService(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<User> RegisterUser(SignUpRequest request)
        {
            bool emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (emailExists)
            {
                throw new InvalidOperationException("Este e-mail já está em uso.");
            }

            string hashedPassword = HashPassword(request.Password);
            var newUser = new User
            {
                Name = request.Name,
                Email = request.Email,
                PasswordHash = hashedPassword,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return newUser;
        }

        private string HashPassword(string password)
        {
            return $"HASH_SECRET_{password.GetHashCode()}";
        }

        public async Task<LoginResponse> LoginUser(LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
                throw new InvalidOperationException("Usuário não encontrado.");

            string hashedPassword = HashPassword(request.Password);

            if (user.PasswordHash != hashedPassword)
                throw new InvalidOperationException("Senha incorreta.");

            // 👉 gera token JWT
            string token = GenerateJwtToken(user);

            return new LoginResponse
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Token = token
            };
        }

        private string GenerateJwtToken(User user)
        {
            var secret = _config["Jwt:Secret"];
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("name", user.Name)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(3),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
