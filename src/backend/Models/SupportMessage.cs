using System;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.Models
{
    // Mensagens do mural de apoio na página de homenagem à Tifanny Abreu.
    // Público, sem necessidade de ser o autor logado a exibir — mas o
    // envio ainda exige estar autenticado no sistema (Authorize no controller).
    public class SupportMessage
    {
        public int Id { get; set; }

        [MaxLength(60)]
        public string? AuthorName { get; set; } // null = anônimo

        [Required]
        [MaxLength(300)]
        public string Message { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
