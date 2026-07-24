using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AtsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityAuthorFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "Activities",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByEmail",
                table: "Activities",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "JobId",
                table: "Activities",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 23, 48, 59, 976, DateTimeKind.Utc).AddTicks(247));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 23, 48, 59, 976, DateTimeKind.Utc).AddTicks(2779));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 23, 48, 59, 974, DateTimeKind.Utc).AddTicks(9799));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 23, 48, 59, 975, DateTimeKind.Utc).AddTicks(1608));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "CreatedByEmail",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "Activities");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 22, 46, 12, 44, DateTimeKind.Utc).AddTicks(315));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 22, 46, 12, 44, DateTimeKind.Utc).AddTicks(3239));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 22, 46, 12, 43, DateTimeKind.Utc).AddTicks(3846));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 23, 22, 46, 12, 43, DateTimeKind.Utc).AddTicks(4977));
        }
    }
}
