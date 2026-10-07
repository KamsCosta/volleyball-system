using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    public class PlayerRequest
    {
        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Position is required.")]
        [MaxLength(50)]
        public string Position { get; set; } = string.Empty;

        [Range(1, 99, ErrorMessage = "Number must be between 1 and 99.")]
        public int Number { get; set; }

        [Range(100, 250, ErrorMessage = "Height must be between 100 and 250 cm.")]
        public int Height { get; set; }
    }
}
