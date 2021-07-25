using JwtAuth.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using JwtAuth.Models.EfCore;
using JwtAuth.Models.DTO;

namespace JwtAuth.Services
{
    public class AuthService : IAuthService
    {
        private readonly IConfiguration configuration;
        private readonly AppDbContext dbContext;

        public AuthService(UserManager<User> userManager,
            IConfiguration configuration,
            AppDbContext dbContext)
        {
            this.configuration = configuration;
            this.dbContext = dbContext;
        }
        public async Task<AuthTokens> GenerateAuthTokens(string userId, HttpRequestInfo requestInfo)
        {
            var accessToken = GenerateAccessToken(userId);
            var refreshTokenStr = GenerateRefreshToken();
            var refreshTokenDb = new RefreshTokenDb
            {
                UserId = userId,
                TokenString = refreshTokenStr,
                CreateTime = DateTime.UtcNow,
                Expiry = DateTime.UtcNow.AddHours(Convert.ToDouble((configuration["Jwt:RefresTokenExpiry"]))),
                Ip = requestInfo.Ip,
                DeviceInfo = requestInfo.UserAgent
            };

            await dbContext.RefreshTokens.AddAsync(refreshTokenDb);
            await dbContext.SaveChangesAsync();

            var authTokens = new AuthTokens
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenDb
            };

            return authTokens;
        }

        public async Task<AuthTokens> Refresh(string token, HttpRequestInfo requestInfo)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new InvalidOperationException("Empty token");
            }

            var refreshTokenDetails = await dbContext.RefreshTokens
                .Where(rt => rt.TokenString.Equals(token)).FirstOrDefaultAsync();

            if (refreshTokenDetails != null)
            {
                if (refreshTokenDetails.IsRevoked)
                {
                    //Revoke descendent refresh tokens
                    await RevokeDescendentRefreshTokens(refreshTokenDetails.ReplacedBy, "Suspicious behavior, revoked token attempted in ancestor");
                    throw new SecurityTokenValidationException("Revoked refresh token given");
                }

                else if (!refreshTokenDetails.Ip.Equals(requestInfo.Ip))
                {
                    refreshTokenDetails.IsRevoked = true;
                    refreshTokenDetails.RevokeTime = DateTime.UtcNow;
                    refreshTokenDetails.RevokeReason = "Suspicious behavior, IP address mismatch";
                    await dbContext.SaveChangesAsync();

                    //Revoke descendent refresh tokens
                    await RevokeDescendentRefreshTokens(refreshTokenDetails.ReplacedBy, "Suspicious behavior, IP address mismatch in ancestor");
                    throw new SecurityTokenValidationException("Ip address mismatch on refresh token");
                }

                else if (refreshTokenDetails.Expiry < DateTime.UtcNow)
                {
                    throw new SecurityTokenValidationException("Expired refresh token given");
                }

                else if(refreshTokenDetails.Expiry > DateTime.UtcNow && 
                    refreshTokenDetails.Expiry.Subtract(DateTime.UtcNow).TotalMinutes <=
                    Convert.ToDouble(configuration["jwt:RefresTokenExpiry"])/3)
                {
                    var accessToken = GenerateAccessToken(refreshTokenDetails.UserId);
                    var authTokens = new AuthTokens
                    {
                        AccessToken = accessToken,
                        RefreshToken = refreshTokenDetails
                    };
                    return authTokens;
                }

                else
                {
                    var authTokens = await GenerateAuthTokens(refreshTokenDetails.UserId, requestInfo);
                    refreshTokenDetails.IsRevoked = true;
                    refreshTokenDetails.RevokeTime = DateTime.UtcNow;
                    refreshTokenDetails.ReplacedBy = authTokens.RefreshToken.Id.ToString();
                    refreshTokenDetails.RevokedByIp = requestInfo.Ip;
                    refreshTokenDetails.RevokedByDevice = requestInfo.UserAgent;
                    refreshTokenDetails.RevokeReason = "New token generated because expiry time came closer";
                    await dbContext.SaveChangesAsync();
                    return authTokens;
                }
            }

            else
            {
                throw new InvalidOperationException("Non-existent token given");
            }
        }

        private async Task RevokeDescendentRefreshTokens(string descendentRefreshTokenId, string message)
        {
            if (descendentRefreshTokenId != null)
            {
                while (descendentRefreshTokenId != null)
                {
                    var descendentRefreshToken = await dbContext.RefreshTokens.FindAsync(new Guid(descendentRefreshTokenId));
                    if (descendentRefreshToken != null)
                    {
                        descendentRefreshToken.IsRevoked = true;
                        descendentRefreshToken.RevokeTime = DateTime.UtcNow;
                        descendentRefreshToken.RevokeReason = message;
                        await dbContext.SaveChangesAsync();
                    }
                    descendentRefreshTokenId = descendentRefreshToken?.ReplacedBy;
                }
            }
        }

        private string GenerateAccessToken(string userId)
        {
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId)
                }),
                Issuer = configuration["jwt:Issuer"],
                Audience = configuration["jwt:Audience"],
                Expires = DateTime.UtcNow.AddHours(Convert.ToDouble(configuration["Jwt:AccessTokenExpiry"])),
                SigningCredentials = new SigningCredentials(new
                    SymmetricSecurityKey(Encoding.ASCII.GetBytes(configuration["jwt:Secret"])), SecurityAlgorithms.HmacSha256),
            };

            var handler = new JwtSecurityTokenHandler();
            var token = handler.CreateToken(tokenDescriptor);
            var accessToken = handler.WriteToken(token);
            return accessToken;
        }
        private string GenerateRefreshToken()
        {
            var randomBytes = new byte[32];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(randomBytes);
            }

            return Convert.ToBase64String(randomBytes);
        }

        public async Task<bool> RevokeRefreshToken(string token, string userId, HttpRequestInfo requestInfo)
        {
            var refreshTokenDetails = await dbContext.RefreshTokens
               .Where(rt => rt.TokenString.Equals(token) && rt.UserId == userId).FirstOrDefaultAsync();

            if(refreshTokenDetails != null)
            {
                refreshTokenDetails.IsRevoked = true;
                refreshTokenDetails.RevokeTime = DateTime.UtcNow;
                refreshTokenDetails.RevokedByIp = requestInfo.Ip;
                refreshTokenDetails.RevokedByDevice = requestInfo.UserAgent;
                refreshTokenDetails.RevokeReason = "Request by client";
                await dbContext.SaveChangesAsync();
                return true;
            }
            else
            {
                return false;
            }
        }
    }
}
