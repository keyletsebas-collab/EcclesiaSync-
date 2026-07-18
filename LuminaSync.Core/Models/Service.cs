using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [Table("services")]
    public class Service : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [Column("member_id")]
        public string MemberId { get; set; } = string.Empty;

        [Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [Column("member_name")]
        public string MemberName { get; set; } = string.Empty;

        [Column("service_date")]
        public string ServiceDate { get; set; } = string.Empty;

        [Column("service_type")]
        public string ServiceType { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("program")]
        public string Program { get; set; } = string.Empty;

        [Column("assigned_members")]
        public string AssignedMembers { get; set; } = "[]";
    }
}
