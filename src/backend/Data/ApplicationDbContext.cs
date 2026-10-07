using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User>               Users               { get; set; }
        public DbSet<Player>             Players             { get; set; }
        public DbSet<Test>               Tests               { get; set; }
        public DbSet<TestSkillResult>    TestSkillResults    { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        public DbSet<AuditLog>           AuditLogs           { get; set; }
        public DbSet<SupportMessage>     SupportMessages     { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Player>()
                .HasIndex(p => p.Number)
                .IsUnique();

            modelBuilder.Entity<Test>()
                .HasOne(t => t.Player)
                .WithMany()
                .HasForeignKey(t => t.PlayerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Test>()
                .HasOne(t => t.Coach)
                .WithMany()
                .HasForeignKey(t => t.CoachId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<TestSkillResult>()
                .HasOne(s => s.Test)
                .WithMany(t => t.SkillResults)
                .HasForeignKey(s => s.TestId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
