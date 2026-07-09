using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AtsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateAdditionalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Candidates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Ownership",
                table: "Candidates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Candidates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Candidates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Candidates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WorkAuthorization",
                table: "Candidates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 16, 0, 473, DateTimeKind.Utc).AddTicks(7506));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 16, 0, 474, DateTimeKind.Utc).AddTicks(209));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 16, 0, 473, DateTimeKind.Utc).AddTicks(626));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 16, 0, 473, DateTimeKind.Utc).AddTicks(1808));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "Ownership",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "WorkAuthorization",
                table: "Candidates");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 12, 45, 5, DateTimeKind.Utc).AddTicks(4372));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 12, 45, 5, DateTimeKind.Utc).AddTicks(7233));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 12, 45, 4, DateTimeKind.Utc).AddTicks(6316));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 12, 45, 4, DateTimeKind.Utc).AddTicks(7537));
        }
    }
}
