using System;
using System.Collections.Generic;
using SQLite;
using Postgrest.Models;
using Postgrest.Attributes;

namespace LuminaSync.Core.Models
{
    public class SupabaseLocalModel : BaseModel
    {
        [Ignore]
        public new Dictionary<Postgrest.Attributes.PrimaryKeyAttribute, object> PrimaryKey { get; set; } = new();

        [Ignore]
        public new Postgrest.ClientOptions? RequestClientOptions { get; set; }
    }
}
