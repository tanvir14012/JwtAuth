using JwtAuth.Models.DTO;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace JwtAuth.Services
{
    public interface IProfileService
    {
        Task<UserDTO> Create(UserDTO user);
        Task<UserDTO> Get(int id);
        Task<UserDTO> Update(UserDTO user);
        Task<ICollection<UserDTO>> GetAll();
        Task<bool> Delete(string id);
    }
}
