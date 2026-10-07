using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VolleyballSystem.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCoachAndIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CoachId",
                table: "Tests",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tests_CoachId",
                table: "Tests",
                column: "CoachId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_Users_CoachId",
                table: "Tests",
                column: "CoachId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tests_Users_CoachId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_CoachId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CoachId",
                table: "Tests");
        }
    }
}
