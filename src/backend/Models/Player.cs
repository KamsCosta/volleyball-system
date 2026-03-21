using System;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.Models
{
    public class Player
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Position { get; set; } = string.Empty;

        [Range(1, 99)]
        public int Number { get; set; }

        [Range(100, 250)]
        public int Height { get; set; } // em cm

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
