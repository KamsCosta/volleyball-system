using System;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public string Action { get; set; } = string.Empty;   // "LOGIN" | "SIGNUP" | "RESET_REQUEST" | "RESET_SUCCESS"

        public string Email { get; set; } = string.Empty;

        public bool Success { get; set; }

        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
