﻿using Microsoft.EntityFrameworkCore.Migrations;
using System;
using System.Collections.Generic;

namespace cloudscribe.SimpleContent.Storage.EFCore.SQLite.Migrations
{
    public partial class simplecontentchanges20180206 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoTeaserMode",
                table: "cs_ContentProject");

            migrationBuilder.DropColumn(
                name: "UseMetaDescriptionInFeed",
                table: "cs_ContentProject");

            migrationBuilder.RenameColumn(
                name: "SuppressAutoTeaser",
                table: "cs_Post",
                newName: "SuppressTeaser");

            migrationBuilder.AlterColumn<byte>(
                name: "TeaserTruncationMode",
                table: "cs_ContentProject",
                nullable: false,
                defaultValue: (byte)0,
                oldClrType: typeof(byte),
                oldDefaultValue: (byte)0)
                .OldAnnotation("Sqlite:Autoincrement", true);

            migrationBuilder.AddColumn<byte>(
                name: "TeaserMode",
                table: "cs_ContentProject",
                nullable: false,
                defaultValue: (byte)0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TeaserMode",
                table: "cs_ContentProject");

            migrationBuilder.RenameColumn(
                name: "SuppressTeaser",
                table: "cs_Post",
                newName: "SuppressAutoTeaser");

            migrationBuilder.AlterColumn<byte>(
                name: "TeaserTruncationMode",
                table: "cs_ContentProject",
                nullable: false,
                defaultValue: (byte)0,
                oldClrType: typeof(byte),
                oldDefaultValue: (byte)0)
                .Annotation("Sqlite:Autoincrement", true);

            migrationBuilder.AddColumn<byte>(
                name: "AutoTeaserMode",
                table: "cs_ContentProject",
                nullable: false,
                defaultValue: (byte)0)
                .Annotation("Sqlite:Autoincrement", true);

            migrationBuilder.AddColumn<bool>(
                name: "UseMetaDescriptionInFeed",
                table: "cs_ContentProject",
                nullable: false,
                defaultValue: false);
        }
    }
}
