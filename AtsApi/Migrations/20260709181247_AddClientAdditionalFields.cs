using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AtsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddClientAdditionalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AboutCompany",
                table: "Clients",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ContactsJson",
                table: "Clients",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FederalId",
                table: "Clients",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PaymentTerms",
                table: "Clients",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PrimaryOwner",
                table: "Clients",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "Clients",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AboutCompany", "ContactsJson", "CreatedAt", "FederalId", "PaymentTerms", "PrimaryOwner", "Website" },
                values: new object[] { "Global leader in product manufacturing and tech services.", "[{\"Name\":\"John Doe\",\"Email\":\"jdoe@acme.com\",\"Phone\":\"555-0111\",\"Title\":\"HR Manager\"}]", new DateTime(2026, 7, 9, 18, 12, 45, 5, DateTimeKind.Utc).AddTicks(4372), "12-3456789", "Net 30", "Aazam Qureshi", "https://acme.com" });

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "AboutCompany", "ContactsJson", "CreatedAt", "FederalId", "PaymentTerms", "PrimaryOwner", "Website" },
                values: new object[] { "International industrial equipment supplier.", "[]", new DateTime(2026, 7, 9, 18, 12, 45, 5, DateTimeKind.Utc).AddTicks(7233), "98-7654321", "Net 45", "Aazam Qureshi", "https://globex.com" });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AboutCompany",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "ContactsJson",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "FederalId",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "PaymentTerms",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "PrimaryOwner",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "Clients");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 8, 14, 16, 9, 460, DateTimeKind.Utc).AddTicks(2184));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 8, 14, 16, 9, 460, DateTimeKind.Utc).AddTicks(3677));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 8, 14, 16, 9, 459, DateTimeKind.Utc).AddTicks(5313));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 8, 14, 16, 9, 459, DateTimeKind.Utc).AddTicks(6597));
        }
    }
}
