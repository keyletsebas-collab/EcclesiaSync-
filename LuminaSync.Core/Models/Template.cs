using System;
using SQLite;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [SQLite.Table("templates")]
    [Postgrest.Attributes.Table("templates")]
    public class Template : BaseModel
    {
        [SQLite.PrimaryKey]
        [Postgrest.Attributes.PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [SQLite.Column("account_id")]
        [Postgrest.Attributes.Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [SQLite.Column("name")]
        [Postgrest.Attributes.Column("name")]
        public string Name { get; set; } = string.Empty;

        [SQLite.Column("custom_fields")]
        [Postgrest.Attributes.Column("custom_fields")]
        public string CustomFields { get; set; } = "[]";

        [SQLite.Column("created_at")]
        [Postgrest.Attributes.Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
