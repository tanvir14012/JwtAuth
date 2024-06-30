using JwtAuth.Models.DTO;
using JwtAuth.Models.EfCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Services
{
    public class ProfileService : IProfileService
    {
        private readonly AppDbContext dbContext;
        private readonly IWebHostEnvironment webHost;
        private readonly UserManager<User> userManager;

        public ProfileService(AppDbContext dbContext, IWebHostEnvironment webHost,
            UserManager<User> userManager)
        {
            this.dbContext = dbContext;
            this.webHost = webHost;
            this.userManager = userManager;
        }

        public async Task<UserDTO> Create(UserDTO user)
        {
            var userEntity = new User { };
            foreach (var propertyInfo in user.GetType().GetProperties().Where(p => p.CanWrite))
            {

                var targetPropInfo = userEntity.GetType().GetProperty(propertyInfo.Name);

                if (targetPropInfo != null && propertyInfo.PropertyType == targetPropInfo.PropertyType)
                {
                    targetPropInfo.SetValue(userEntity, propertyInfo.GetValue(user, null));
                }
            }

            if (user.ProfilePicture != null)
            {
                string dir = Path.Join(webHost.WebRootPath, "ProfilePic");
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                using Stream fileStream = new FileStream(Path.Join(dir, user.ProfilePicture.FileName), FileMode.Create);
                await user.ProfilePicture.CopyToAsync(fileStream);
                userEntity.ProfilePicUrl = Path.Join(dir, user.ProfilePicture.FileName);

                ///Return the image in base64
               
                using MemoryStream memStream = new MemoryStream();
                await user.ProfilePicture.CopyToAsync(memStream);
                byte[] bytes = memStream.ToArray();
                user.ProfilePicUrl = "data:image/png;base64," + Convert.ToBase64String(bytes);
            }

            userEntity.UserName = user.Email.Split("@")[0];


            var result = await userManager.CreateAsync(userEntity, "User@123");
            if(result.Succeeded)
            {
                user.Id = userEntity.Id;
                return user;
            }
            throw new InvalidDataException(result.Errors.Select(err => err.Description).FirstOrDefault());
        }

        public async Task<bool> Delete(string id)
        {
            var user = await userManager.FindByIdAsync(id);
            var result = await userManager.DeleteAsync(user);

            //Delete the profile picture
            if(result.Succeeded)
            {
                if(user.ProfilePicUrl != null)
                {
                    try
                    {
                        File.Delete(user.ProfilePicUrl);
                    }
                    catch { }
                }
            }
            return result.Succeeded;
        }

        public async Task<UserDTO> Get(int id)
        {
            var user = await dbContext.Users.AsNoTracking()
                    .FirstOrDefaultAsync(user => user.Id == id);

            var userDTO = new UserDTO { };

            foreach (var propertyInfo in user.GetType().GetProperties().Where(p => p.CanWrite))
            {

                var targetPropInfo = userDTO.GetType().GetProperty(propertyInfo.Name);

                if (targetPropInfo != null)
                {
                    targetPropInfo.SetValue(userDTO, propertyInfo.GetValue(user, null));
                }
            }

            if (userDTO.ProfilePicUrl != null)
            {
                try
                {
                    byte[] bytes = System.IO.File.ReadAllBytes(userDTO.ProfilePicUrl);
                    userDTO.ProfilePicUrl = "data:image/png;base64," + Convert.ToBase64String(bytes);
                }
                catch { }

            }

            return userDTO;
        }

        public async Task<ICollection<UserDTO>> GetAll()
        {
            var users = await dbContext.Users.AsNoTracking()
                    .ToListAsync();

            var userDTOs = new List<UserDTO>();

            foreach (var user in users)
            {
                var userDTO = new UserDTO { };
                foreach (var propertyInfo in user.GetType().GetProperties().Where(p => p.CanWrite))
                {
                    var targetPropInfo = userDTO.GetType().GetProperty(propertyInfo.Name);

                    if (targetPropInfo != null)
                    {
                        targetPropInfo.SetValue(userDTO, propertyInfo.GetValue(user, null));
                    }
                }

                if (userDTO.ProfilePicUrl != null)
                {
                    byte[] bytes = File.ReadAllBytes(userDTO.ProfilePicUrl);
                    userDTO.ProfilePicUrl = "data:image/png;base64," + Convert.ToBase64String(bytes);
                }
                userDTOs.Add(userDTO);
            }

            return userDTOs;
        }

        public async Task<UserDTO> Update(UserDTO user)
        {
            var userFromDb = await dbContext.Users.FindAsync(user.Id);
            if (userFromDb != null)
            {
                foreach (var propertyInfo in user.GetType().GetProperties().Where(p => p.CanWrite))
                {
                    if(propertyInfo.Name != "ProfilePicUrl")
                    {
                        var targetPropInfo = userFromDb.GetType().GetProperty(propertyInfo.Name);

                        if (targetPropInfo != null && propertyInfo.Name == targetPropInfo.Name)
                        {
                            targetPropInfo.SetValue(userFromDb, propertyInfo.GetValue(user, null));
                        }
                    }
                }

                //Update username as well
                if (user.Email != null)
                {
                    userFromDb.NormalizedEmail = user.Email.ToUpper();
                    userFromDb.UserName = user.Email.Split("@")[0];
                    userFromDb.NormalizedUserName = user.Email.Split("@")[0].ToUpper();
                }

                if (user.ProfilePicture != null)
                {
                    string dir = Path.Join(webHost.WebRootPath, "ProfilePic");
                    if (!Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }

                    using Stream fileStream = new FileStream(Path.Join(dir, user.ProfilePicture.FileName), FileMode.Create);
                    await user.ProfilePicture.CopyToAsync(fileStream);
                    userFromDb.ProfilePicUrl = Path.Join(dir, user.ProfilePicture.FileName);
                }

                await dbContext.SaveChangesAsync();

                foreach (var propertyInfo in userFromDb.GetType().GetProperties().Where(p => p.CanWrite))
                {

                    var targetPropInfo = user.GetType().GetProperty(propertyInfo.Name);

                    if (targetPropInfo != null && propertyInfo.Name == targetPropInfo.Name)
                    {
                        targetPropInfo.SetValue(user, propertyInfo.GetValue(userFromDb, null));
                    }
                }
                user.ProfilePicture = null;
                if (user != null)
                {
                    try
                    {
                        byte[] bytes = System.IO.File.ReadAllBytes(user.ProfilePicUrl);
                        user.ProfilePicUrl = "data:image/png;base64," + Convert.ToBase64String(bytes);
                    }
                    catch
                    {

                    }

                }

                return user;
            }

            throw new InvalidOperationException();
        }
    }
}
