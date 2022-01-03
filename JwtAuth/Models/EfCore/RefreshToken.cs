using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.EfCore
{
    public class RefreshToken
    {

        public Guid Id { get; set; }
        public int UserId { get; set; }
        public string TokenString { get; set; }
        public bool IsSessionLocked { get; set; }
        public DateTimeOffset CreateTime { get; set; }
        public DateTimeOffset Expiry { get; set; }
        public string Ip { get; set; }
        public string UserAgent { get; set; }
        public string BrowserIdentifier { get; set; }
        public bool RememberMe { get; set; }
        public DateTimeOffset? RememberMeUntil { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime? RevokeTime { get; set; }
        public string RevokeReason { get; set; }
        public string RevokedByIp { get; set; }
        public string RevokedByUserAgent { get; set; }
        public Guid? RotatedBy { get; set; }
    }
}
