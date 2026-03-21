using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.Models;
using VolleyballSystem.API.DTOs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PlayersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PlayersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/players
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Player>>> GetPlayers()
        {
            var players = await _context.Players
                .OrderBy(p => p.Number)
                .ToListAsync();

            return Ok(players);
        }

        // GET: api/players/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Player>> GetPlayer(int id)
        {
            var player = await _context.Players.FindAsync(id);

            if (player == null)
                return NotFound(new { message = "Jogador não encontrado." });

            return Ok(player);
        }

        // POST: api/players
        [HttpPost]
        public async Task<ActionResult<Player>> CreatePlayer([FromBody] CreatePlayerDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var numberExists = await _context.Players.AnyAsync(p => p.Number == dto.Number);
            if (numberExists)
                return BadRequest(new { message = "Já existe um jogador com esse número." });

            var player = new Player
            {
                Name = dto.Name,
                Position = dto.Position,
                Number = dto.Number,
                Height = dto.Height
            };

            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlayer), new { id = player.Id }, player);
        }

        // PUT: api/players/5
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdatePlayer(int id, [FromBody] UpdatePlayerDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var player = await _context.Players.FindAsync(id);

            if (player == null)
                return NotFound(new { message = "Jogador não encontrado." });

            var numberExists = await _context.Players
                .AnyAsync(p => p.Number == dto.Number && p.Id != id);

            if (numberExists)
                return BadRequest(new { message = "Outro jogador já usa esse número." });

            player.Name = dto.Name;
            player.Position = dto.Position;
            player.Number = dto.Number;
            player.Height = dto.Height;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Jogador atualizado com sucesso." });
        }

        // DELETE: api/players/5
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePlayer(int id)
        {
            var player = await _context.Players.FindAsync(id);

            if (player == null)
                return NotFound(new { message = "Jogador não encontrado." });

            _context.Players.Remove(player);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Jogador removido com sucesso." });
        }
    }
}
