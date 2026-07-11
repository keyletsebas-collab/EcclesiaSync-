using System;
using SQLite;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [SQLite.Table("users")]
    [Postgrest.Attributes.Table("users")]
    public class User : SupabaseLocalModel
    {
        [SQLite.PrimaryKey]
        [Postgrest.Attributes.PrimaryKey("uid", false)]
        public string Uid { get; set; } = string.Empty;

        [SQLite.Column("username")]
        [Postgrest.Attributes.Column("username")]
        public string Username { get; set; } = string.Empty;

        [SQLite.Column("password")]
        [Postgrest.Attributes.Column("password")]
        public string Password { get; set; } = string.Empty;

        [SQLite.Column("is_master")]
        [Postgrest.Attributes.Column("is_master")]
        public bool IsMaster { get; set; }

        [SQLite.Column("account_id")]
        [Postgrest.Attributes.Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [SQLite.Column("created_at")]
        [Postgrest.Attributes.Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [SQLite.Column("is_blocked")]
        [Postgrest.Attributes.Column("is_blocked")]
        public bool IsBlocked { get; set; }

        [SQLite.Column("memberships")]
        [Postgrest.Attributes.Column("memberships")]
        public string memberships { get; set; } = "[]";
    }
}
