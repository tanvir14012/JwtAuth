using JwtAuth.Models.EfCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class AuthTokens
    {
        public string AccessTokenDTO { get; set; }
        public RefreshTokenDTO RefreshToken { get; set; }
        public bool RequiresSignOut { get; set; }
        public string BrowserIdentifier { get; set; }
    }

    public class RefreshTokenDTO
    {
        public string TokenString { get; set; }
    }

    public class AccessTokenDTO
    {
        public string TokenString { get; set; }
    }
}
