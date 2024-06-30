using JwtAuth.Models;
using JwtAuth.Models.EfCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace JwtAuth.Services
{
    public static class SeedInitialData
    {
        public static async Task SeedAdminData(IServiceProvider serviceProvider, IConfiguration configuration)
        {
            try
            {
                var userManager = serviceProvider.CreateScope().ServiceProvider.GetRequiredService<UserManager<User>>();
                var claims = configuration.GetSection("InitialDbSeed:Admin:Claims").Get<string[]>();
                var adminEmail = configuration["InitialDbSeed:Admin:Email"];
                var adminUser = await userManager.FindByEmailAsync(adminEmail);
                if (adminUser == null)
                {
                    var admin = new User
                    {
                        UserName = configuration["InitialDbSeed:Admin:Email"].Split("@")[0],
                        Email = configuration["InitialDbSeed:Admin:Email"],
                        FirstName = configuration["InitialDbSeed:Admin:FirstName"],
                        LastName = configuration["InitialDbSeed:Admin:LastName"],
                        SessionLockEnabled = true
                    };
                    var result = await userManager.CreateAsync(admin, configuration["InitialDbSeed:Admin:Password"]);
                    if (result.Succeeded)
                    {
                        await userManager.AddClaimAsync(admin, new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()));
                        if (claims != null)
                        {
                            foreach (var claim in claims)
                            {
                                await userManager.AddClaimAsync(admin, new Claim(claim.Split(":")[0], claim.Split(":")[1]));
                            }
                        }
                    }
                }
            }
            catch { }

        }
    }
}
