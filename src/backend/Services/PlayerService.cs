using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Services
{
    public class PlayerService
    {
        private readonly ApplicationDbContext _context;

        public PlayerService(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET ALL
        public async Task<List<PlayerResponse>> GetAllAsync()
        {
            return await _context.Players
                .OrderBy(p => p.Name)
                .Select(p => ToResponse(p))
                .ToListAsync();
        }

        // GET BY ID
        public async Task<PlayerResponse?> GetByIdAsync(int id)
        {
            var player = await _context.Players.FindAsync(id);
            return player == null ? null : ToResponse(player);
        }

        // CREATE
        public async Task<PlayerResponse> CreateAsync(PlayerRequest request)
        {
            // Verifica se número já existe
            var numberExists = await _context.Players
                .AnyAsync(p => p.Number == request.Number);

            if (numberExists)
                throw new InvalidOperationException($"Já existe um atleta com o número {request.Number}.");

            var player = new Player
            {
                Name      = request.Name,
                Position  = request.Position,
                Number    = request.Number,
                Height    = request.Height,
                CreatedAt = DateTime.UtcNow
            };

            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            return ToResponse(player);
        }

        // UPDATE
        public async Task<PlayerResponse?> UpdateAsync(int id, PlayerRequest request)
        {
            var player = await _context.Players.FindAsync(id);
            if (player == null) return null;

            // Verifica se número já existe em outro atleta
            var numberExists = await _context.Players
                .AnyAsync(p => p.Number == request.Number && p.Id != id);

            if (numberExists)
                throw new InvalidOperationException($"Já existe um atleta com o número {request.Number}.");

            player.Name     = request.Name;
            player.Position = request.Position;
            player.Number   = request.Number;
            player.Height   = request.Height;

            await _context.SaveChangesAsync();

            return ToResponse(player);
        }

        // DELETE
        public async Task<bool> DeleteAsync(int id)
        {
            var player = await _context.Players.FindAsync(id);
            if (player == null) return false;

            _context.Players.Remove(player);
            await _context.SaveChangesAsync();
            return true;
        }

        // HELPER
        private static PlayerResponse ToResponse(Player p) => new PlayerResponse
        {
            Id        = p.Id,
            Name      = p.Name,
            Position  = p.Position,
            Number    = p.Number,
            Height    = p.Height,
            CreatedAt = p.CreatedAt
        };
    }
}
