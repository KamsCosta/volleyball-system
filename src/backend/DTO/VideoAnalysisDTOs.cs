using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    // O que o serviço Python devolve por repetição
    public class RepetitionAnalysis
    {
        public int Index { get; set; }
        public int Frame { get; set; }
        public double TimeSeconds { get; set; }
        public double HandsDistanceRatio { get; set; }
        public double LeftElbowAngle { get; set; }
        public double RightElbowAngle { get; set; }
        public bool ProvisionalValid { get; set; }
        public List<TechniqueCheck> Checks { get; set; } = new();
    }

    // Item do checklist técnico de uma repetição (ex.: "Base baixa").
    // Reliable = false: medido, mas fora do palpite (precisão insuficiente).
    public class TechniqueCheck
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public double? Value { get; set; }
        public bool? Passed { get; set; }
        public bool Reliable { get; set; }
    }

    // Resposta completa do serviço Python
    public class PythonAnalysisResponse
    {
        public string SkillType { get; set; } = string.Empty;
        public int TotalFrames { get; set; }
        public double PoseDetectionRate { get; set; }
        public string AnalyzedView { get; set; } = "full";   // full | left | right (quem foi avaliado)
        public int RepetitionsDetected { get; set; }
        public int MachineHits { get; set; }
        public int MachineErrors { get; set; }
        public List<RepetitionAnalysis> Repetitions { get; set; } = new();
        public string Disclaimer { get; set; } = string.Empty;
        public string? AnnotatedVideoId { get; set; }   // buscar em GET {python}/annotated/{id}
    }

    // O que o frontend recebe depois que o .NET processa e salva
    public class VideoAnalysisResultResponse
    {
        public int TestSkillResultId { get; set; }
        public int SkillIndex { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public int ManualHits { get; set; }         // o que o treinador digitou originalmente
        public int? MachineHits { get; set; }
        public int? MachineErrors { get; set; }
        public int RepetitionsDetected { get; set; }
        public double PoseDetectionRate { get; set; }
        public string AnalyzedView { get; set; } = "full";
        public List<RepetitionAnalysis> Repetitions { get; set; } = new();
        public string Disclaimer { get; set; } = string.Empty;
        public DateTime AnalyzedAt { get; set; }
        public string? VideoUrl { get; set; }            // vídeo original enviado
        public string? AnnotatedVideoUrl { get; set; }   // vídeo com o que a IA viu desenhado
        public bool? CoachAgreesWithMachine { get; set; }
        public string? CoachComment { get; set; }
    }

    // Requisição do treinador pra confirmar/corrigir o palpite da máquina
    public class CoachReviewRequest
    {
        [Required]
        public bool AgreesWithMachine { get; set; }

        [MaxLength(500)]
        public string? Comment { get; set; }

        // Se o treinador discordar, ele pode informar o valor final correto
        [Range(0, 10)]
        public int? FinalHits { get; set; }
    }
}
