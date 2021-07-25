using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class SignUp
    {
        [RegularExpression("^[A-Za-z ]{1,25}$", ErrorMessage = "First name can contain only letters and length should be between 1 and 25")]
        public string FirstName { get; set; }
        [RegularExpression("^[A-Za-z ]{1,25}$", ErrorMessage = "Last name can contain only letters and length should be between 1 and 25")]
        public string LastName { get; set; }
        [MaxLength(256)]
        [DataType(DataType.EmailAddress, ErrorMessage = "Email address is not correct")]
        public string Email { get; set; }
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,64}$", ErrorMessage = "Password must contain at least one uppercase, one lowercase, one digit and one non-alphanumeric character. Password lenght should be between 6 and 64")]
        public string Password { get; set; }

    }
}
