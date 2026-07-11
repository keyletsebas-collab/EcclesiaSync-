using System;
using SQLite;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [SQLite.Table("services")]
    [Postgrest.Attributes.Table("services")]
    public class Service : BaseModel
    {
        [SQLite.PrimaryKey]
        [Postgrest.Attributes.PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [SQLite.Column("template_id")]
        [Postgrest.Attributes.Column("template_id")]
        public string TemplateId { get; set; } = string.Empty;

        [SQLite.Column("member_id")]
        [Postgrest.Attributes.Column("member_id")]
        public string MemberId { get; set; } = string.Empty;

        [SQLite.Column("account_id")]
        [Postgrest.Attributes.Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [SQLite.Column("member_name")]
        [Postgrest.Attributes.Column("member_name")]
        public string MemberName { get; set; } = string.Empty;

        [SQLite.Column("service_date")]
        [Postgrest.Attributes.Column("service_date")]
        public string ServiceDate { get; set; } = string.Empty;

        [SQLite.Column("service_type")]
        [Postgrest.Attributes.Column("service_type")]
        public string ServiceType { get; set; } = string.Empty;

        [SQLite.Column("created_at")]
        [Postgrest.Attributes.Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
