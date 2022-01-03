using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
namespace JwtAuth.Models.DTO
{
    public class SigninResult
    {
        public int UserId { get; set; }
        public bool Succeeded { get; set; }
        public string AccessToken { get; set; }
        public bool AccountLocked { get; set; }
        public bool ConfirmationRequired { get; set; }
        public bool ValidationFailed { get; set; }
        public string ErrorMessage { get; set; }
    }
}
