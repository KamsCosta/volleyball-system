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
    public class TestService
    {
        private readonly ApplicationDbContext _context;

        public TestService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<TestResponse>> GetAllAsync()
        {
            return await _context.Tests
                .Include(t => t.Player)
                .Include(t => t.Coach)
                .Include(t => t.SkillResults)
                .OrderByDescending(t => t.TestDate)
                .Select(t => ToResponse(t))
                .ToListAsync();
        }

        public async Task<TestResponse?> GetByIdAsync(int id)
        {
            var test = await _context.Tests
                .Include(t => t.Player)
                .Include(t => t.Coach)
                .Include(t => t.SkillResults)
                .FirstOrDefaultAsync(t => t.Id == id);

            return test == null ? null : ToResponse(test);
        }

        public async Task<List<TestResponse>> GetByPlayerAsync(int playerId)
        {
            return await _context.Tests
                .Include(t => t.Player)
                .Include(t => t.Coach)
                .Include(t => t.SkillResults)
                .Where(t => t.PlayerId == playerId)
                .OrderBy(t => t.TestDate)
                .Select(t => ToResponse(t))
                .ToListAsync();
        }

        public async Task<TestResponse> CreateAsync(TestRequest request)
        {
            var player = await _context.Players.FindAsync(request.PlayerId);
            if (player == null)
                throw new InvalidOperationException("Player not found.");

            var test = new Test
            {
                PlayerId       = request.PlayerId,
                CoachId        = request.CoachId,
                Category       = request.Category,
                TestDate       = request.TestDate,
                Notes          = request.Notes,
                TotalHits      = request.TotalHits,
                TotalErrors    = request.TotalErrors,
                Classification = request.Classification,
                CreatedAt      = DateTime.UtcNow,
                SkillResults   = request.SkillResults.Select(s => new TestSkillResult
                {
                    SkillIndex = s.SkillIndex,
                    SkillName  = s.SkillName,
                    Hits       = s.Hits,
                    Errors     = s.Errors
                }).ToList()
            };

            _context.Tests.Add(test);
            await _context.SaveChangesAsync();

            return (await GetByIdAsync(test.Id))!;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var test = await _context.Tests.FindAsync(id);
            if (test == null) return false;
            _context.Tests.Remove(test);
            await _context.SaveChangesAsync();
            return true;
        }

        // Stats para o dashboard
        public async Task<object> GetStatsAsync()
        {
            var total = await _context.Tests.CountAsync();
            var recent = await _context.Tests
                .Include(t => t.Player)
                .OrderByDescending(t => t.TestDate)
                .Take(5)
                .Select(t => new {
                    t.Id,
                    PlayerName     = t.Player.Name,
                    t.Category,
                    t.Classification,
                    t.TotalHits,
                    HitRate        = Math.Round((double)t.TotalHits / 160 * 100, 1),
                    t.TestDate
                })
                .ToListAsync();

            return new { total, recent };
        }

        // Evolução do atleta — para o gráfico
        public async Task<object> GetEvolutionAsync(int playerId)
        {
            var tests = await _context.Tests
                .Include(t => t.SkillResults)
                .Where(t => t.PlayerId == playerId)
                .OrderBy(t => t.TestDate)
                .ToListAsync();

            var evolution = tests.Select(t => new {
                testId         = t.Id,
                date           = t.TestDate.ToString("dd/MM/yyyy"),
                category       = t.Category,
                classification = t.Classification,
                totalHits      = t.TotalHits,
                hitRate        = Math.Round((double)t.TotalHits / 160 * 100, 1),
                skills         = t.SkillResults
                    .OrderBy(s => s.SkillIndex)
                    .Select(s => new {
                        s.SkillIndex,
                        s.SkillName,
                        s.Hits,
                        HitRate = Math.Round((double)s.Hits / 10 * 100, 1)
                    })
            });

            return new { playerId, evolution };
        }

        private static TestResponse ToResponse(Test t) => new TestResponse
        {
            Id             = t.Id,
            PlayerId       = t.PlayerId,
            PlayerName     = t.Player?.Name ?? "",
            PlayerPosition = t.Player?.Position ?? "",
            PlayerNumber   = t.Player?.Number ?? 0,
            CoachId        = t.CoachId,
            CoachName      = t.Coach?.Name ?? "–",
            Category       = t.Category,
            TestDate       = t.TestDate,
            Notes          = t.Notes,
            TotalHits      = t.TotalHits,
            TotalErrors    = t.TotalErrors,
            Classification = t.Classification,
            HitRate        = Math.Round((double)t.TotalHits / 160 * 100, 1),
            CreatedAt      = t.CreatedAt,
            SkillResults   = t.SkillResults?
                .OrderBy(s => s.SkillIndex)
                .Select(s => new SkillResultResponse {
                    SkillIndex = s.SkillIndex,
                    SkillName  = s.SkillName,
                    Hits       = s.Hits,
                    Errors     = s.Errors,
                    HitRate    = Math.Round((double)s.Hits / 10 * 100, 1)
                }).ToList() ?? new()
        };
    }
}
