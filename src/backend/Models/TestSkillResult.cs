using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VolleyballSystem.API.Models
{
    public class TestSkillResult
    {
        [Key]
        public int Id { get; set; }

        public int TestId { get; set; }

        [ForeignKey("TestId")]
        public Test Test { get; set; } = null!;

        public int SkillIndex { get; set; }

        [MaxLength(100)]
        public string SkillName { get; set; } = string.Empty;

        [Range(0, 10)]
        public int Hits { get; set; }

        [Range(0, 10)]
        public int Errors { get; set; }
    }
}
