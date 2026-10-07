using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VolleyballSystem.API.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoAnalysisFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnalysisDetailsJson",
                table: "TestSkillResults",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AnalyzedAt",
                table: "TestSkillResults",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CoachAgreesWithMachine",
                table: "TestSkillResults",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoachComment",
                table: "TestSkillResults",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MachineErrors",
                table: "TestSkillResults",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MachineHits",
                table: "TestSkillResults",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoPath",
                table: "TestSkillResults",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnalysisDetailsJson",
                table: "TestSkillResults");

            migrationBuilder.DropColumn(
                name: "AnalyzedAt",
                table: "TestSkillResults");

            migrationBuilder.DropColumn(
                name: "CoachAgreesWithMachine",
                table: "TestSkillResults");

            migrationBuilder.DropColumn(
                name: "CoachComment",
                table: "TestSkillResults");

            migrationBuilder.DropColumn(
                name: "MachineErrors",
                table: "TestSkillResults");

            migrationBuilder.DropColumn(
                name: "MachineHits",
                table: "TestSkillResults");

            migrationBuilder.DropColumn(
                name: "VideoPath",
                table: "TestSkillResults");
        }
    }
}
