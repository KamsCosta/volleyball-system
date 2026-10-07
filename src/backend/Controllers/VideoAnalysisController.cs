using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Controllers
{
    // Habilidades suportadas pela análise de vídeo neste MVP.
    // Mapeamento SkillIndex -> tipo de análise no serviço Python.
    // (0 = Static Manchete, 1 = Static Toque — ver lista completa em new-test.js)
    public static class VideoAnalysisSkillMap
    {
        public static readonly System.Collections.Generic.Dictionary<int, string> SupportedSkills = new()
        {
            { 0, "static_manchete" },
            { 1, "static_toque" },
        };
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class VideoAnalysisController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;

        public VideoAnalysisController(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            IWebHostEnvironment env)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _env = env;
        }

        // GET api/videoanalysis/supported-skills
        // Frontend usa isso pra saber em quais habilidades mostrar o botão de upload
        [HttpGet("supported-skills")]
        public IActionResult GetSupportedSkills()
        {
            return Ok(VideoAnalysisSkillMap.SupportedSkills.Keys);
        }

        // POST api/videoanalysis/test-skill-results/{id}/analyze
        // Recebe o vídeo, envia pro serviço Python, salva o resultado
        [HttpPost("test-skill-results/{id}/analyze")]
        [RequestSizeLimit(200_000_000)] // ~200MB, vídeos podem ser grandes
        public async Task<IActionResult> AnalyzeVideo(int id, IFormFile video)
        {
            if (video == null || video.Length == 0)
                return BadRequest(new { message = "No video was sent." });

            var skillResult = await _context.TestSkillResults
                .FirstOrDefaultAsync(s => s.Id == id);

            if (skillResult == null)
                return NotFound(new { message = "Skill result not found." });

            if (!VideoAnalysisSkillMap.SupportedSkills.TryGetValue(skillResult.SkillIndex, out var skillType))
            {
                return BadRequest(new
                {
                    message = "Video analysis is not available for this skill yet.",
                    supportedSkillIndexes = VideoAnalysisSkillMap.SupportedSkills.Keys
                });
            }

            // Confere se o serviço Python está no ar ANTES de salvar o vídeo
            // (antes, o vídeo era salvo e a análise falhava, deixando arquivo órfão)
            var healthUrl = (_config["VideoAnalysis:ServiceUrl"] ?? "http://localhost:5001") + "/health";
            try
            {
                var healthClient = _httpClientFactory.CreateClient();
                healthClient.Timeout = TimeSpan.FromSeconds(5);
                (await healthClient.GetAsync(healthUrl)).EnsureSuccessStatusCode();
            }
            catch (Exception)
            {
                return StatusCode(503, new
                {
                    message = "The video analysis service is off. Start the system with " +
                              "tools\\iniciar-sistema.ps1 (or run 'python app.py' in src/video-analysis-service) and upload again."
                });
            }

            // Salva o vídeo em disco (wwwroot/uploads/videos)
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads", "videos");
            Directory.CreateDirectory(uploadsFolder);
            var fileName = $"skill_{id}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(video.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await video.CopyToAsync(stream);
            }

            // Chama o serviço Python
            var pythonServiceUrl = _config["VideoAnalysis:ServiceUrl"] ?? "http://localhost:5001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(5); // vídeo pode demorar pra processar

            PythonAnalysisResponse? analysisResult;
            try
            {
                using var form = new MultipartFormDataContent();
                await using var videoStream = System.IO.File.OpenRead(filePath);
                var streamContent = new StreamContent(videoStream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("video/mp4");
                form.Add(streamContent, "video", fileName);
                form.Add(new StringContent(skillType), "skillType");

                var response = await client.PostAsync($"{pythonServiceUrl}/analyze", form);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode(502, new
                    {
                        message = "The video analysis service returned an error.",
                        details = responseBody
                    });
                }

                analysisResult = JsonSerializer.Deserialize<PythonAnalysisResponse>(responseBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new
                {
                    message = "Could not connect to the video analysis service. Is it running? (python app.py)",
                    details = ex.Message
                });
            }

            if (analysisResult == null)
                return StatusCode(500, new { message = "Invalid response from the analysis service." });

            // Vídeo anotado (o que a IA viu): salvo ao lado do original como "<nome>_ia.mp4".
            // Se falhar, a análise continua valendo; só o vídeo anotado fica indisponível.
            if (!string.IsNullOrEmpty(analysisResult.AnnotatedVideoId))
            {
                try
                {
                    var annotatedBytes = await client.GetByteArrayAsync(
                        $"{pythonServiceUrl}/annotated/{analysisResult.AnnotatedVideoId}");
                    await System.IO.File.WriteAllBytesAsync(
                        Path.Combine(_env.ContentRootPath, AnnotatedRelativePath($"/uploads/videos/{fileName}").TrimStart('/')),
                        annotatedBytes);
                }
                catch (HttpRequestException)
                {
                    // segue sem o vídeo anotado
                }
            }

            // Salva o resultado no banco
            skillResult.MachineHits = analysisResult.MachineHits;
            skillResult.MachineErrors = analysisResult.MachineErrors;
            skillResult.VideoPath = $"/uploads/videos/{fileName}";
            skillResult.AnalyzedAt = DateTime.UtcNow;
            skillResult.AnalysisDetailsJson = JsonSerializer.Serialize(analysisResult.Repetitions);
            skillResult.CoachAgreesWithMachine = null; // aguardando revisão
            skillResult.CoachComment = null;

            await _context.SaveChangesAsync();

            return Ok(new VideoAnalysisResultResponse
            {
                TestSkillResultId = skillResult.Id,
                SkillIndex = skillResult.SkillIndex,
                SkillName = skillResult.SkillName,
                ManualHits = skillResult.Hits,
                MachineHits = skillResult.MachineHits,
                MachineErrors = skillResult.MachineErrors,
                RepetitionsDetected = analysisResult.RepetitionsDetected,
                PoseDetectionRate = analysisResult.PoseDetectionRate,
                AnalyzedView = analysisResult.AnalyzedView,
                Repetitions = analysisResult.Repetitions,
                Disclaimer = analysisResult.Disclaimer,
                AnalyzedAt = skillResult.AnalyzedAt.Value,
                VideoUrl = skillResult.VideoPath,
                AnnotatedVideoUrl = AnnotatedUrlIfExists(skillResult.VideoPath)
            });
        }

        // "/uploads/videos/skill_5_2026.mp4" -> "/uploads/videos/skill_5_2026_ia.mp4"
        private static string AnnotatedRelativePath(string videoPath)
        {
            var dir = videoPath.Substring(0, videoPath.LastIndexOf('/') + 1);
            return dir + Path.GetFileNameWithoutExtension(videoPath) + "_ia.mp4";
        }

        private string? AnnotatedUrlIfExists(string? videoPath)
        {
            if (string.IsNullOrEmpty(videoPath)) return null;
            var relative = AnnotatedRelativePath(videoPath);
            var full = Path.Combine(_env.ContentRootPath, relative.TrimStart('/'));
            return System.IO.File.Exists(full) ? relative : null;
        }

        // GET api/videoanalysis/test-skill-results/{id}
        // Recupera uma análise já feita (pra reabrir a tela sem reprocessar o vídeo)
        [HttpGet("test-skill-results/{id}")]
        public async Task<IActionResult> GetAnalysis(int id)
        {
            var skillResult = await _context.TestSkillResults.FirstOrDefaultAsync(s => s.Id == id);
            if (skillResult == null)
                return NotFound(new { message = "Skill result not found." });

            if (skillResult.AnalyzedAt == null)
                return NotFound(new { message = "This skill has not been analyzed by video yet." });

            var repetitions = string.IsNullOrEmpty(skillResult.AnalysisDetailsJson)
                ? new System.Collections.Generic.List<RepetitionAnalysis>()
                : JsonSerializer.Deserialize<System.Collections.Generic.List<RepetitionAnalysis>>(
                    skillResult.AnalysisDetailsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            return Ok(new VideoAnalysisResultResponse
            {
                TestSkillResultId = skillResult.Id,
                SkillIndex = skillResult.SkillIndex,
                SkillName = skillResult.SkillName,
                ManualHits = skillResult.Hits,
                MachineHits = skillResult.MachineHits,
                MachineErrors = skillResult.MachineErrors,
                RepetitionsDetected = repetitions.Count,
                PoseDetectionRate = 0, // não guardamos isso separadamente hoje
                Repetitions = repetitions,
                Disclaimer = "Provisional machine estimate. The final evaluation is the coach's.",
                AnalyzedAt = skillResult.AnalyzedAt.Value,
                VideoUrl = skillResult.VideoPath,
                AnnotatedVideoUrl = AnnotatedUrlIfExists(skillResult.VideoPath),
                CoachAgreesWithMachine = skillResult.CoachAgreesWithMachine,
                CoachComment = skillResult.CoachComment
            });
        }

        // PUT api/videoanalysis/test-skill-results/{id}/review
        // O treinador confirma ou corrige o palpite da máquina
        [HttpPut("test-skill-results/{id}/review")]
        public async Task<IActionResult> ReviewAnalysis(int id, [FromBody] CoachReviewRequest request)
        {
            var skillResult = await _context.TestSkillResults.FirstOrDefaultAsync(s => s.Id == id);
            if (skillResult == null)
                return NotFound(new { message = "Skill result not found." });

            if (skillResult.AnalyzedAt == null)
                return BadRequest(new { message = "This skill has not been analyzed by video yet." });

            skillResult.CoachAgreesWithMachine = request.AgreesWithMachine;
            skillResult.CoachComment = request.Comment;

            // Se o treinador discordou e informou o valor certo, isso vira o valor oficial
            if (!request.AgreesWithMachine && request.FinalHits.HasValue)
            {
                skillResult.Hits = request.FinalHits.Value;
                skillResult.Errors = 10 - request.FinalHits.Value;
            }
            else if (request.AgreesWithMachine && skillResult.MachineHits.HasValue)
            {
                // Se concordou com a máquina, o valor da máquina vira o oficial
                skillResult.Hits = skillResult.MachineHits.Value;
                skillResult.Errors = skillResult.MachineErrors ?? (10 - skillResult.MachineHits.Value);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Review saved successfully.",
                finalHits = skillResult.Hits,
                finalErrors = skillResult.Errors
            });
        }
    }
}
