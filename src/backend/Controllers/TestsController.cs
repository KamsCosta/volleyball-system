using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Services;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TestsController : ControllerBase
    {
        private readonly TestService _testService;

        public TestsController(TestService testService)
        {
            _testService = testService;
        }

        // GET api/tests
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var tests = await _testService.GetAllAsync();
            return Ok(tests);
        }

        // GET api/tests/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var test = await _testService.GetByIdAsync(id);
            if (test == null)
                return NotFound(new { message = "Test not found." });
            return Ok(test);
        }

        // GET api/tests/player/{playerId}
        [HttpGet("player/{playerId}")]
        public async Task<IActionResult> GetByPlayer(int playerId)
        {
            var tests = await _testService.GetByPlayerAsync(playerId);
            return Ok(tests);
        }

        // GET api/tests/player/{playerId}/evolution
        [HttpGet("player/{playerId}/evolution")]
        public async Task<IActionResult> GetEvolution(int playerId)
        {
            var evolution = await _testService.GetEvolutionAsync(playerId);
            return Ok(evolution);
        }

        // GET api/tests/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _testService.GetStatsAsync();
            return Ok(stats);
        }

        // POST api/tests
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TestRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var test = await _testService.CreateAsync(request);
                return StatusCode(201, test);
            }
            catch (System.InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/tests/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _testService.DeleteAsync(id);
            if (!deleted)
                return NotFound(new { message = "Test not found." });
            return Ok(new { message = "Test deleted successfully." });
        }
    }
}
