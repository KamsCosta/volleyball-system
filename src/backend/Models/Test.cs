using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VolleyballSystem.API.Models
{
    public class Test
    {
        [Key]
        public int Id { get; set; }

        public int PlayerId { get; set; }

        [ForeignKey("PlayerId")]
        public Player Player { get; set; } = null!;

        public int? CoachId { get; set; }

        [ForeignKey("CoachId")]
        public User? Coach { get; set; }

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        public DateTime TestDate { get; set; }

        public string? Notes { get; set; }

        public int TotalHits { get; set; }

        public int TotalErrors { get; set; }

        [MaxLength(50)]
        public string Classification { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<TestSkillResult> SkillResults { get; set; } = new List<TestSkillResult>();
    }
}
