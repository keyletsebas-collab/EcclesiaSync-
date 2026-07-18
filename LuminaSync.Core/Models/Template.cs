using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [Table("templates")]
    public class Template : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("custom_fields")]
        public string CustomFields { get; set; } = "[]";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
