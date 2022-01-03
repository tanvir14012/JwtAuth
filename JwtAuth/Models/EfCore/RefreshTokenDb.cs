using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.EfCore
{
    public class RefreshTokenDb
    {

        public Guid Id { get; set; }
        public string UserId { get; set; }
        public string TokenString { get; set; }
        public DateTime CreateTime { get; set; }
        public DateTime Expiry { get; set; }
        public string Ip { get; set; }
        public string DeviceInfo { get; set; }
        public string ReplacedBy { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime? RevokeTime { get; set; }
        public string RevokeReason { get; set; }
        public string RevokedByIp { get; set; }
        public string RevokedByDevice { get; set; }
    }
}
