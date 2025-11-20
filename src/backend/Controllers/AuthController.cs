using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
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

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _authService.RegisterUser(model);

                return StatusCode(201, new
                {
                    id = user.Id,
                    email = user.Email,
                    message = "Conta criada com sucesso!"
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _authService.LoginUser(model);

                return Ok(new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    message = "Login realizado com sucesso!"
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        } 

        [Authorize]
        [HttpGet("protected")]
        public IActionResult ProtectedRoute()
        {
            return Ok(new
            {
                message = "Acesso permitido! Seu token é válido :)"
            });
        }
    }
}

