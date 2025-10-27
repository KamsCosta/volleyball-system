using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    public class SignUpRequest
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "O e-mail é obrigatório.")]
        [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "A senha é obrigatória.")]
        [MinLength(6, ErrorMessage = "A senha deve ter no mínimo 6 caracteres.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "A confirmação de senha é obrigatória.")]
        [Compare(nameof(Password), ErrorMessage = "A senha e a confirmação não correspondem.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
