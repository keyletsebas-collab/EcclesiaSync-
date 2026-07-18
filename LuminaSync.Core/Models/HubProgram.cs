using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [Table("programs")]
    public class HubProgram : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("content")]
        public string Content { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
