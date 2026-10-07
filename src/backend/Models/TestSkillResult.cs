using System;
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

        // ─── ANÁLISE DE VÍDEO (IA) ──────────────────────────────
        // Palpite provisório da máquina — nunca substitui Hits/Errors
        // automaticamente. O treinador decide se aceita ou não.
        public int? MachineHits { get; set; }
        public int? MachineErrors { get; set; }

        [MaxLength(400)]
        public string? VideoPath { get; set; }

        public DateTime? AnalyzedAt { get; set; }

        // Revisão do treinador sobre o palpite da máquina
        public bool? CoachAgreesWithMachine { get; set; }

        [MaxLength(500)]
        public string? CoachComment { get; set; }

        // JSON serializado com o detalhe de cada repetição analisada
        // (ângulos, distâncias, timestamps) — guardado como texto simples
        // pra não precisar de uma tabela nova só pra isso no MVP.
        public string? AnalysisDetailsJson { get; set; }
    }
}
