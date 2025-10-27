using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using VolleyballSystem.API.Services;
using VolleyballSystem.API.DTO;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Rota base: /api/auth
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        // DI: O AuthService é injetado automaticamente.
        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        // ROTA: POST /api/auth/signup
        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] SignUpRequest model)
        {
            // O ASP.NET Core verifica automaticamente se o DTO é válido ([Required], [Compare]).
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState); // Retorna 400 Bad Request
            }

            try
            {
                // Chama a lógica de negócio no Serviço
                var user = await _authService.RegisterUser(model);

                // Retorna 201 Created (Criado com sucesso)
                return StatusCode(201, new
                {
                    id = user.Id,
                    email = user.Email,
                    message = "Conta criada com sucesso!"
                });
            }
            catch (InvalidOperationException ex)
            {
                // Captura a exceção lançada pelo Service (ex: "e-mail já em uso")
                return BadRequest(new { message = ex.Message }); // Retorna 400
            }
        }

        // *Em breve, você adicionaria o endpoint de Login aqui!*
        // [HttpPost("login")]
        // public IActionResult Login(...) { ... }
    }
}
