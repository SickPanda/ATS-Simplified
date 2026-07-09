using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AtsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddJobAdditionalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Clients_ClientId",
                table: "Jobs");

            migrationBuilder.AlterColumn<int>(
                name: "ClientId",
                table: "Jobs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BillRate",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ClientJobId",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "JobCode",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "PayRate",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryRecruiter",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RecruitmentManager",
                table: "Jobs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 17, 28, 839, DateTimeKind.Utc).AddTicks(2958));

            migrationBuilder.UpdateData(
                table: "Clients",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 17, 28, 839, DateTimeKind.Utc).AddTicks(5669));

            migrationBuilder.UpdateData(
                table: "Jobs",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BillRate", "ClientJobId", "JobCode", "PayRate", "PrimaryRecruiter", "RecruitmentManager" },
                values: new object[] { 120.00m, "CJ-0012", "REQ-101", 85.00m, "Aazam Qureshi", "Aazam Qureshi" });

            migrationBuilder.UpdateData(
                table: "Jobs",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "BillRate", "ClientJobId", "JobCode", "PayRate", "PrimaryRecruiter", "RecruitmentManager" },
                values: new object[] { 100.00m, "CJ-0034", "REQ-102", 70.00m, "Sarah Jenkins", "Aazam Qureshi" });

            migrationBuilder.UpdateData(
                table: "Jobs",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "BillRate", "ClientJobId", "JobCode", "PayRate", "PrimaryRecruiter", "RecruitmentManager" },
                values: new object[] { 140.00m, "CJ-0056", "REQ-103", 95.00m, "Michael Chang", "Aazam Qureshi" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 17, 28, 838, DateTimeKind.Utc).AddTicks(5016));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "CreatedAt",
                value: new DateTime(2026, 7, 9, 18, 17, 28, 838, DateTimeKind.Utc).AddTicks(6288));

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Clients_ClientId",
                table: "Jobs",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Clients_ClientId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "BillRate",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "ClientJobId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "JobCode",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "PayRate",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "PrimaryRecruiter",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "RecruitmentManager",
                table: "Jobs");

            migrationBuilder.AlterColumn<int>(
                name: "ClientId",
                table: "Jobs",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

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

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Clients_ClientId",
                table: "Jobs",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id");
        }
    }
}
