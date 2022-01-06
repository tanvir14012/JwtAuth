using JwtAuth.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class UserDTO
    {
        public int Id { get; set; }
        [MaxLength(25)]
        [RegularExpression(@"^[a-zA-Z ]+$", ErrorMessage = "First name should contain only letters")]
        public string FirstName { get; set; }
        [MaxLength(25)]
        [RegularExpression(@"^[a-zA-Z ]+$", ErrorMessage = "Last name should contain only letters")]
        public string LastName { get; set; }

        [DataType(DataType.EmailAddress)]
        public string Email { get; set; }
        [DataType(DataType.PhoneNumber)]
        public string PhoneNumber { get; set; }
        [MaxLength(50)]
        public string AddressLine1 { get; set; }
        [MaxLength(50)]
        public string AddressLine2 { get; set; }
        [MaxLength(50)]
        public string Country { get; set; }
        [MaxLength(150)]
        public string ProfilePicUrl { get; set; }
        [MaxLength(1000)]
        public string ShortBio { get; set; }

        [AllowedExtensions(new string[] { "jpg", "jpeg", "png", "gif", "tiff" })]
        public IFormFile ProfilePicture { get; set; }
    }
}