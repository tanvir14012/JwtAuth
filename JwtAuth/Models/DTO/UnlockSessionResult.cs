using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class UnlockSessionResult
    {
        public bool UnlockSuccess { get; set; }
        public bool SignedOut { get; set; }
        public string AccessToken { get; set; }
        public string ErrorMessage { get; set; }
    }
}
