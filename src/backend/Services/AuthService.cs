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

        // DI: O DbContext é injetado automaticamente
        public AuthService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Método para registrar um novo usuário
        public async Task<User> RegisterUser(SignUpRequest request)
        {
            // 1. Verifica se o e-mail já está em uso (regra de negócio)
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

            // 4. Salva no banco e retorna o usuário
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync(); // Finaliza a operação (INSERT)

            return newUser;
        }

        // Exemplo simples de hashing (substituir por BCrypt/Argon2!)
        private string HashPassword(string password)
        {
            return $"HASH_SECRET_{password.GetHashCode()}";
        }

        // *Em breve, você adicionaria o método de Login aqui!*
        // public async Task<string> LoginUser(...) { ... }
    }
}
