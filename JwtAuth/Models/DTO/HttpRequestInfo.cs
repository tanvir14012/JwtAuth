using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Models.DTO
{
    public class HttpRequestInfo
    {
        public string Ip { get; set; }
        public string UserAgent { get; set; }
    }
}
