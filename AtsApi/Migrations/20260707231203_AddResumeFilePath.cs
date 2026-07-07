using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AtsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddResumeFilePath : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ResumeFilePath",
                table: "Candidates",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResumeFilePath",
                table: "Candidates");
        }
    }
}
