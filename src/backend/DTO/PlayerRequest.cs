using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    public class PlayerRequest
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "A posição é obrigatória.")]
        [MaxLength(50)]
        public string Position { get; set; } = string.Empty;

        [Range(1, 99, ErrorMessage = "O número deve ser entre 1 e 99.")]
        public int Number { get; set; }

        [Range(100, 250, ErrorMessage = "A altura deve ser entre 100 e 250 cm.")]
        public int Height { get; set; }
    }
}
