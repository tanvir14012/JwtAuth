using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class PasswordResetDTO
    {
        [Required]
        public string UserId { get; set; }

        [Required]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,64}$", ErrorMessage = "Password must contain at least one uppercase, one lowercase, one digit and one non-alphanumeric character. Password lenght should be between 6 and 64")]
        public string Password { get; set; }
    }
}
