using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [Table("transactions")]
    public class Transaction : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [Column("type")]
        public string Type { get; set; } = string.Empty; // "income" or "expense"

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("date")]
        public string Date { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
