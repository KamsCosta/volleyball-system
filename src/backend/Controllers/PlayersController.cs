using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Services;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // todas as rotas exigem token JWT
    public class PlayersController : ControllerBase
    {
        private readonly PlayerService _playerService;

        public PlayersController(PlayerService playerService)
        {
            _playerService = playerService;
        }

        // GET api/players
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var players = await _playerService.GetAllAsync();
            return Ok(players);
        }

        // GET api/players/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var player = await _playerService.GetByIdAsync(id);
            if (player == null)
                return NotFound(new { message = "Atleta não encontrado." });

            return Ok(player);
        }

        // POST api/players
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PlayerRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var player = await _playerService.CreateAsync(request);
                return StatusCode(201, player);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT api/players/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PlayerRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var player = await _playerService.UpdateAsync(id, request);
                if (player == null)
                    return NotFound(new { message = "Atleta não encontrado." });

                return Ok(player);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/players/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _playerService.DeleteAsync(id);
            if (!deleted)
                return NotFound(new { message = "Atleta não encontrado." });

            return Ok(new { message = "Atleta removido com sucesso." });
        }
    }
}
