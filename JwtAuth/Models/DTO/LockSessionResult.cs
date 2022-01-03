using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class LockSessionResult
    {
        public bool IsSignedOut { get; set; }
        public bool IsSessionLocked { get; set; }
        public string AccessToken { get; set; }
        public string ErrorMessage { get; set; }
    }
}
