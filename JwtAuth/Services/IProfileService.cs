using JwtAuth.Models.DTO;
using JwtAuth.Models.EfCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Services
{
    public interface IProfileService
    {
        Task<UserDTO> Create(UserDTO user);
        Task<UserDTO> Get(string id);
        Task<UserDTO> Update(UserDTO user);
        Task<ICollection<UserDTO>> GetAll();
        Task<bool> Delete(string id);
    }
}
