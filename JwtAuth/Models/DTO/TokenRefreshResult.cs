using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class TokenRefreshResult
    {
        public bool RefreshSucceeded { get; set; }
        public bool SignedOut { get; set; }
        public bool IsSessionLocked { get; set; }
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public string FailureReason { get; set; }
    }
}
