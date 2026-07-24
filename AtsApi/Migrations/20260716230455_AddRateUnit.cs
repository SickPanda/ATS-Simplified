using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AtsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRateUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RateUnit",
                table: "Placements",
                type: "TEXT",
                nullable: false,
                defaultValue: "Hourly");

            migrationBuilder.AddColumn<string>(
                name: "RateUnit",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: "Hourly");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 16, 23, 4, 52, 696, DateTimeKind.Utc).AddTicks(3889));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 16, 23, 4, 52, 696, DateTimeKind.Utc).AddTicks(6815));

            migrationBuilder.UpdateData(
                table: "Jobs",
                keyColumn: "Id",
                keyValue: 1,
                column: "RateUnit",
                value: "Hourly");

            migrationBuilder.UpdateData(
                table: "Jobs",
                keyColumn: "Id",
                keyValue: 2,
                column: "RateUnit",
                value: "Hourly");

            migrationBuilder.UpdateData(
                table: "Jobs",
                keyColumn: "Id",
                keyValue: 3,
                column: "RateUnit",
                value: "Hourly");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 16, 23, 4, 52, 695, DateTimeKind.Utc).AddTicks(6912));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 16, 23, 4, 52, 695, DateTimeKind.Utc).AddTicks(8135));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RateUnit",
                table: "Placements");

            migrationBuilder.DropColumn(
                name: "RateUnit",
                table: "Jobs");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 19, 52, 49, 230, DateTimeKind.Utc).AddTicks(3494));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 19, 52, 49, 230, DateTimeKind.Utc).AddTicks(5905));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 19, 52, 49, 229, DateTimeKind.Utc).AddTicks(6587));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 19, 52, 49, 229, DateTimeKind.Utc).AddTicks(7833));
        }
    }
}
