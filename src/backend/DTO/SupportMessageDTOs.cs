using System;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    public class CreateSupportMessageRequest
    {
        [MaxLength(60)]
        public string? AuthorName { get; set; }

        [Required]
        [MinLength(2, ErrorMessage = "Message is too short.")]
        [MaxLength(300)]
        public string Message { get; set; } = string.Empty;
    }

    public class SupportMessageResponse
    {
        public int Id { get; set; }
        public string? AuthorName { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
