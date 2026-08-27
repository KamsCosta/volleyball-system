using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    public class TestRequest
    {
        [Required]
        public int PlayerId { get; set; }

        public int? CoachId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        [Required]
        public DateTime TestDate { get; set; }

        public string? Notes { get; set; }

        public int TotalHits { get; set; }

        public int TotalErrors { get; set; }

        [Required]
        [MaxLength(50)]
        public string Classification { get; set; } = string.Empty;

        [Required]
        public List<SkillResultRequest> SkillResults { get; set; } = new();
    }

    public class SkillResultRequest
    {
        public int SkillIndex { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public int Hits { get; set; }
        public int Errors { get; set; }
    }

    public class TestResponse
    {
        public int Id { get; set; }
        public int PlayerId { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public string PlayerPosition { get; set; } = string.Empty;
        public int PlayerNumber { get; set; }
        public int? CoachId { get; set; }
        public string CoachName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateTime TestDate { get; set; }
        public string? Notes { get; set; }
        public int TotalHits { get; set; }
        public int TotalErrors { get; set; }
        public string Classification { get; set; } = string.Empty;
        public double HitRate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SkillResultResponse> SkillResults { get; set; } = new();
    }

    public class SkillResultResponse
    {
        public int SkillIndex { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public int Hits { get; set; }
        public int Errors { get; set; }
        public double HitRate { get; set; }
    }
}
