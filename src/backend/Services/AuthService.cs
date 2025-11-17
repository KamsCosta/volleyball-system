using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.Models;
using VolleyballSystem.API.DTO;

namespace VolleyballSystem.API.Services
{
    public class AuthService
    {
        private readonly ApplicationDbContext _context;
        public AuthService(ApplicationDbContext context)
        {
            _context = context;
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
        
        public async Task<User> LoginUser (LoginRequest request)

        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
                throw new InvalidOperationException("usuário não encontrado.");
            
            string hashedPassword = HashPassword(request.Password);

            if (user.PasswordHash !=hashedPassword)
                throw new InvalidOperationException("Senha incorreta.");
            
            return user;

        }
    }
}
