using System;

namespace VolleyballSystem.API.DTO
{
    public class PlayerResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public int Number { get; set; }
        public int Height { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
