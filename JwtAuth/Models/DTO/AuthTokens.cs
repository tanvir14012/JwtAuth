using JwtAuth.Models.EfCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class AuthTokens
    {
        public string AccessToken { get; set; }
        public RefreshTokenDb RefreshToken { get; set; }
    }

    public class RefreshToken
    {
        public string TokenString { get; set; }
    }

    public class RefreshTokenRevokeInfo
    {
        public string RevokedBy { get; set; }
        public string RevokeReason { get; set; }
        public string RevokedByIp { get; set; }
        public string RevokedByDevice { get; set; }
    }

    public class AccessToken
    {
        public string TokenString { get; set; }
    }
}
