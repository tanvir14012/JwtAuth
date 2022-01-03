using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class Password
    {
        [Required]
        [MinLength(6)]
        [MaxLength(64)]
        [DataType(DataType.Password)]
        [RegularExpression("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).*$",
           ErrorMessage = "Password should contain one lowercase and one uppercase letter, one digit and one non-alphanumeric character")]
        public string Value { get; set; }
    }
}
