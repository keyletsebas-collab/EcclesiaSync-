using System;
using SQLite;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [SQLite.Table("members")]
    [Postgrest.Attributes.Table("members")]
    public class Member : BaseModel
    {
        [SQLite.PrimaryKey]
        [Postgrest.Attributes.PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [SQLite.Column("template_id")]
        [Postgrest.Attributes.Column("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [SQLite.Column("account_id")]
        [Postgrest.Attributes.Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [SQLite.Column("name")]
        [Postgrest.Attributes.Column("name")]
        public string Name { get; set; } = string.Empty;

        [SQLite.Column("number")]
        [Postgrest.Attributes.Column("number")]
        public int Number { get; set; }

        [SQLite.Column("phone")]
        [Postgrest.Attributes.Column("phone")]
        public string Phone { get; set; } = string.Empty;

        [SQLite.Column("identifications")]
        [Postgrest.Attributes.Column("identifications")]
        public string Identifications { get; set; } = "{}";

        [SQLite.Column("created_at")]
        [Postgrest.Attributes.Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
