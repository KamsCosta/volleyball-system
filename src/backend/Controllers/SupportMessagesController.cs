using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SupportMessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SupportMessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET api/supportmessages — lista o mural, mais recentes primeiro
        // (leitura pública dentro do sistema logado, qualquer coach pode ver)
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var messages = await _context.SupportMessages
                .OrderByDescending(m => m.CreatedAt)
                .Take(200) // limite razoável pra não sobrecarregar a página
                .Select(m => new SupportMessageResponse
                {
                    Id = m.Id,
                    AuthorName = m.AuthorName,
                    Message = m.Message,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(messages);
        }

        // POST api/supportmessages — adiciona uma mensagem de apoio
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupportMessageRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var trimmedMessage = request.Message.Trim();
            if (trimmedMessage.Length < 2)
                return BadRequest(new { message = "Message is too short." });

            var entity = new SupportMessage
            {
                AuthorName = string.IsNullOrWhiteSpace(request.AuthorName) ? null : request.AuthorName.Trim(),
                Message = trimmedMessage,
                CreatedAt = DateTime.UtcNow
            };

            _context.SupportMessages.Add(entity);
            await _context.SaveChangesAsync();

            return StatusCode(201, new SupportMessageResponse
            {
                Id = entity.Id,
                AuthorName = entity.AuthorName,
                Message = entity.Message,
                CreatedAt = entity.CreatedAt
            });
        }
    }
}
