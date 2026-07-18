using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace LuminaSync.Core.Models
{
    [Table("users")]
    public class User : BaseModel
    {
        [PrimaryKey("uid", false)]
        public string Uid { get; set; } = string.Empty;

        [Column("username")]
        public string Username { get; set; } = string.Empty;

        [Column("password")]
        public string Password { get; set; } = string.Empty;

        [Column("is_master")]
        public bool IsMaster { get; set; }

        [Column("account_id")]
        public string AccountId { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_blocked")]
        public bool IsBlocked { get; set; }

        [Column("memberships")]
        public object MembershipsDb { get; set; } = new Newtonsoft.Json.Linq.JArray();

        [Newtonsoft.Json.JsonIgnore]
        public string memberships
        {
            get
            {
                if (MembershipsDb == null) return "[]";
                if (MembershipsDb is string s) return s;
                return Newtonsoft.Json.JsonConvert.SerializeObject(MembershipsDb);
            }
            set
            {
                MembershipsDb = value;
            }
        }

        [Column("birthday")]
        public string Birthday { get; set; } = string.Empty;

        [Column("address")]
        public string Address { get; set; } = string.Empty;
    }
}
