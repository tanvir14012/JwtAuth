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
        private readonly UserManager<User> userManager;
        private readonly IConfiguration configuration;
        private readonly AppDbContext dbContext;

        public AuthService(UserManager<User> userManager,
            IConfiguration configuration,
            AppDbContext dbContext)
        {
            this.userManager = userManager;
            this.configuration = configuration;
            this.dbContext = dbContext;
        }

        /// <summary>
        /// Generates and access token and a refresh token, expiry time is read from configuration file.
        /// </summary>
        /// <param name="user">The logged in user</param>
        /// <param name="rememberMe">Whether to remember browser or not</param>
        /// <param name="requestInfo">HTTP request information e.g. IP</param>
        /// <returns>A JWT access token and a refresh token</returns>
        public async Task<AuthTokens> GenerateAuthTokens(User user, bool rememberMe, HttpRequestInfo requestInfo)
        {
            var refreshTokenStr = GenerateRefreshToken();

            string browserIdentifier = null;
            if (rememberMe)
            {
                browserIdentifier = GenerateSecuredGuid();
            }

            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                TokenString = refreshTokenStr,
                BrowserIdentifier = browserIdentifier,
                CreateTime = DateTimeOffset.UtcNow,
                Expiry = DateTimeOffset.UtcNow.AddHours(Convert.ToDouble((configuration["Jwt:RefreshTokenExpiry"]))),
                Ip = requestInfo.Ip,
                UserAgent = requestInfo.UserAgent,
                RememberMe = rememberMe
            };

            await dbContext.RefreshTokens.AddAsync(refreshTokenEntity);
            await dbContext.SaveChangesAsync();

            var accessToken = await GenerateAccessToken(user, refreshTokenEntity.TokenString);

            var authTokens = new AuthTokens
            {
                AccessTokenDTO = accessToken,
                RefreshToken = new RefreshTokenDTO
                {
                    TokenString = refreshTokenEntity.TokenString
                },
                BrowserIdentifier = browserIdentifier
            };

            return authTokens;
        }

        /// <summary>
        /// Generates a new JWT access token from the refresh token. If the refresh token is revoked or 
        /// the HTTP request's IP address does not match with the refresh token's initial IP address the
        /// refresh token and it's descendants are revoked. An exception is thrown if the user ID does not match or
        /// an expired/invalid token is given.
        /// </summary>
        /// <param name="token">A refresh token string</param>
        /// <param name="browserIdentifier"></param>
        /// <param name="requestInfo">HTTP request information e.g. IP address</param>
        /// <returns>A JWT access toekn and a refresh token, or an exception is thrown</returns>
        public async Task<TokenRefreshResult> Refresh(string token, string browserIdentifier, HttpRequestInfo requestInfo)
        {
            var refreshResult = new TokenRefreshResult { };
            try
            {
                if (string.IsNullOrEmpty(token))
                {
                    refreshResult.RefreshSucceeded = false;
                    refreshResult.SignedOut = true;
                    refreshResult.FailureReason = "Empty token";
                    return refreshResult;
                }

                var refreshTokenDetails = await dbContext.RefreshTokens
                    .Where(rt => rt.TokenString.Equals(token)).FirstOrDefaultAsync();

                if (refreshTokenDetails != null)
                {
                    var user = await dbContext.Users.AsNoTracking()
                        .FirstOrDefaultAsync(user => user.Id == refreshTokenDetails.UserId);

                    if (refreshTokenDetails.IsRevoked)
                    {
                        //Revoke descendent refresh tokens
                        await RevokeDescendentRefreshTokens(refreshTokenDetails.RotatedBy,
                            "Suspicious behavior, revoked token attempted in ancestor", requestInfo);
                        refreshResult.RefreshSucceeded = false;
                        refreshResult.SignedOut = true;
                        refreshResult.FailureReason = "Revoked token attempted in ancestor";
                        return refreshResult;
                    }

                    else if (refreshTokenDetails.RememberMe && !refreshTokenDetails.BrowserIdentifier.Equals(browserIdentifier))
                    {
                        refreshTokenDetails.IsRevoked = true;
                        refreshTokenDetails.RevokeTime = DateTime.UtcNow;
                        refreshTokenDetails.RevokedByIp = requestInfo.Ip;
                        refreshTokenDetails.RevokedByUserAgent = requestInfo.UserAgent;
                        refreshTokenDetails.RevokeReason = "Suspicious behaviour, browser identifier cookie mismatch";
                        await dbContext.SaveChangesAsync();

                        //Revoke descendent refresh tokens
                        await RevokeDescendentRefreshTokens(refreshTokenDetails.RotatedBy,
                            "Browser identifier cookie mismatch in ancestor", requestInfo);

                        refreshResult.RefreshSucceeded = false;
                        refreshResult.SignedOut = true;
                        refreshResult.FailureReason = "Anomaly in browser cookie";
                        return refreshResult;
                    }

                    else if (refreshTokenDetails.Expiry < DateTimeOffset.UtcNow)
                    {
                        refreshResult.RefreshSucceeded = false;
                        refreshResult.SignedOut = true;
                        refreshResult.FailureReason = "Refresh token is expired";
                        return refreshResult;
                    }

                    //Return a sign-out flag when remember-me is off and tokens are expired
                    else if (!refreshTokenDetails.RememberMe && ShouldForget(refreshTokenDetails))
                    {
                        refreshTokenDetails.IsRevoked = true;
                        refreshTokenDetails.RevokeTime = DateTime.UtcNow;
                        refreshTokenDetails.RevokedByIp = requestInfo.Ip;
                        refreshTokenDetails.RevokedByUserAgent = requestInfo.UserAgent;
                        refreshTokenDetails.RevokeReason = "Remember me was not enabled and token was expired";
                        await dbContext.SaveChangesAsync();

                        refreshResult.RefreshSucceeded = false;
                        refreshResult.SignedOut = true;
                        refreshResult.FailureReason = "Tokens are expired";
                        return refreshResult;
                    }

                    //Generate an access token and rotate the refresh token
                    else
                    {
                        var appUser = await userManager.FindByIdAsync(refreshTokenDetails.UserId.ToString());
                        //Revoke the parent token
                        refreshTokenDetails.IsRevoked = true;
                        refreshTokenDetails.RevokeReason = "Rotation";
                        refreshTokenDetails.RevokedByIp = requestInfo.Ip;
                        refreshTokenDetails.RevokedByUserAgent = requestInfo.UserAgent;

                        //Lock the session if session-lock was enabled and the token expired but not-locked
                        if (user.SessionLockEnabled && !refreshTokenDetails.IsSessionLocked &&
                        refreshTokenDetails.RememberMe && ShouldForget(refreshTokenDetails))
                        {
                            refreshTokenDetails.IsSessionLocked = true;
                            refreshResult.IsSessionLocked = true;
                        }

                        await dbContext.SaveChangesAsync();
                        dbContext.ChangeTracker.Clear();

                        var refreshTokenEntity = await RotateRefreshToken(refreshTokenDetails, requestInfo);
                        var accessToken = await GenerateAccessToken(appUser, refreshTokenEntity.TokenString);

                        refreshResult.RefreshSucceeded = true;
                        refreshResult.SignedOut = false;
                        refreshResult.AccessToken = accessToken;
                        refreshResult.RefreshToken = refreshTokenEntity.TokenString;
                        return refreshResult;
                    }
                }
                else
                {
                    refreshResult.RefreshSucceeded = false;
                    refreshResult.SignedOut = true;
                    refreshResult.FailureReason = "Non-existent token given";
                    return refreshResult;
                }
            }
            catch (Exception ex)
            {
                refreshResult.RefreshSucceeded = false;
                refreshResult.SignedOut = false;
                refreshResult.FailureReason = ex.Message;
                return refreshResult;
            }
        }

        /// <summary>
        /// Revokes a given refresh token and its descendants from the database if the token is
        /// valid and exists in the database.
        /// </summary>
        /// <param name="descendentRefreshTokenId">The refresh token to revoke</param>
        /// <param name="message">The message describing revoke reason</param>
        /// <param name="requestInfo">The current HTTP request info.</param>
        private async Task RevokeDescendentRefreshTokens(Guid? descendentRefreshTokenId, string message,
            HttpRequestInfo requestInfo)
        {
            if (descendentRefreshTokenId != null)
            {
                while (descendentRefreshTokenId != null)
                {
                    var descendentRefreshToken = await dbContext.RefreshTokens.FindAsync(descendentRefreshTokenId);
                    if (descendentRefreshToken != null)
                    {
                        descendentRefreshToken.IsRevoked = true;
                        descendentRefreshToken.RevokeTime = DateTime.UtcNow;
                        descendentRefreshToken.RevokeReason = message;
                        descendentRefreshToken.RevokedByIp = requestInfo.Ip;
                        descendentRefreshToken.RevokedByUserAgent = requestInfo.UserAgent;
                        await dbContext.SaveChangesAsync();
                    }
                    descendentRefreshTokenId = descendentRefreshToken.RotatedBy;
                }
            }
        }


        /// <summary>
        /// A JWT access token is generated by reading claims and secret from configuration file.
        /// </summary>
        /// <param name="user">The logged-in user</param>
        /// <param name="refreshToken"></param>
        /// <returns>A JWT access token string</returns>
        private async Task<string> GenerateAccessToken(User user, string refreshToken)
        {
            var roles = await userManager.GetRolesAsync(user);
            var claims = await userManager.GetClaimsAsync(user);
            var refreshTokenDetails = await dbContext.RefreshTokens.AsNoTracking()
               .Where(rt => rt.TokenString.Equals(refreshToken)).FirstOrDefaultAsync();

            bool isAdmin = claims.Any(c => c.Type.Equals("Admin") && c.Value.Equals("Admin"));

            //For validation pass
            if (claims.Count < 1)
            {
                claims = new List<Claim> { new Claim(string.Empty, string.Empty) };
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim("phoneNumber", user.PhoneNumber ?? string.Empty),
                    new Claim(ClaimTypes.Role, string.Join(',', roles)),
                    new Claim("isPersistent", (refreshTokenDetails?.RememberMe ?? false) ? "true": "false"),
                    new Claim("sessionLockEnabled", user.SessionLockEnabled ? "true": "false"),
                    new Claim("claims", string.Join(',', claims)),
                    new Claim("usertype", isAdmin ? "0": "1"),
                    new Claim("isSessionLocked", refreshTokenDetails.IsSessionLocked ? "true": "false")
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

            //Remove old tokens
            RemoveOldRefreshTokens(user.Id);

            return accessToken;
        }

        /// <summary>
        /// Creates a new refresh token from a previous one for rotation purpose.
        /// </summary>
        /// <param name="parentToken">An ancestor refresh token</param>
        /// <param name="requestInfo">HTTP request info e.g. IP, User Agent etc.</param>
        /// <returns>A <c>RefreshToken</c> object.</returns>
        private async Task<RefreshToken> RotateRefreshToken(RefreshToken parentToken, HttpRequestInfo requestInfo)
        {

            var refreshTokenStr = GenerateRefreshToken();
            var refreshTokenEntity = new RefreshToken
            {
                UserId = parentToken.UserId,
                TokenString = refreshTokenStr,
                CreateTime = DateTimeOffset.UtcNow,
                Expiry = DateTimeOffset.UtcNow.AddHours(Convert.ToDouble((configuration["Jwt:RefreshTokenExpiry"]))),
                RotatedBy = parentToken.Id,
                Ip = requestInfo.Ip,
                UserAgent = requestInfo.UserAgent,
                BrowserIdentifier = parentToken.BrowserIdentifier,
                IsRevoked = false,
                IsSessionLocked = parentToken.IsSessionLocked,
                RememberMe = parentToken.RememberMe,
                RememberMeUntil = parentToken.RememberMeUntil
            };

            await dbContext.RefreshTokens.AddAsync(refreshTokenEntity);
            await dbContext.SaveChangesAsync();
            return refreshTokenEntity;
        }

        /// <summary>
        /// A refresh token is generated from a random byte array converted to base64 format.
        /// </summary>
        /// <returns>A base64 string</returns>
        private string GenerateRefreshToken()
        {
            var randomBytes = new byte[32];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(randomBytes);
            }

            return Convert.ToBase64String(randomBytes);
        }

        /// <summary>
        /// A secured guid is generated from a random byte array and returned as a string.
        /// </summary>
        /// <returns>A Guid as base64 string</returns>
        private string GenerateSecuredGuid()
        {
            var randomBytes = new byte[16];
            using (var rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(randomBytes);
            }

            return Convert.ToBase64String(new Guid(randomBytes).ToByteArray());
        }


        /// <summary>
        /// Checks whether a refresh token exists for a given user in the database and revokes
        /// it if found.
        /// </summary>
        /// <param name="token">The refresh token</param>
        /// <param name="userId">The ID of the logged-in user</param>
        /// <param name="requestInfo">HTTP request information e.g. IP</param>
        /// <returns>true or false denoting whether the token is revoked</returns>
        public async Task<bool> RevokeRefreshToken(string token, int userId, HttpRequestInfo requestInfo)
        {
            var refreshTokenDetails = await dbContext.RefreshTokens
               .Where(rt => rt.TokenString.Equals(token) && rt.UserId == userId).FirstOrDefaultAsync();

            if (refreshTokenDetails != null)
            {
                refreshTokenDetails.IsRevoked = true;
                refreshTokenDetails.RevokeTime = DateTime.UtcNow;
                refreshTokenDetails.RevokedByIp = requestInfo.Ip;
                refreshTokenDetails.RevokedByUserAgent = requestInfo.UserAgent;
                refreshTokenDetails.RevokeReason = "Sign-out";
                await dbContext.SaveChangesAsync();
                return true;
            }
            else
            {
                return false;
            }
        }

        /// <summary>
        /// Remove revoked refresh tokens that are old enough.
        /// </summary>
        /// <param name="userId">The userId associated with the refresh token.</param>
        private void RemoveOldRefreshTokens(int userId)
        {
            if (!double.TryParse(configuration["Jwt:RefreshTokenTTL"], out var refreshTokenTTL))
            {
                refreshTokenTTL = 170;
            };
            dbContext.RefreshTokens.RemoveRange(dbContext.RefreshTokens
                .AsNoTracking().Where(token => token.UserId == userId && token.IsRevoked &&
                token.CreateTime.AddHours(refreshTokenTTL) <= DateTimeOffset.UtcNow));
        }

        /// <summary>
        /// Checks if the refresh token has a remember-me-until timestamp and the timestamp is expired or 
        /// the last exchanged access token is expired.
        /// </summary>
        /// <param name="refreshTokenDetails">The refresh token entity.</param>
        /// <returns>Either <c>true</c> or <c>false</c>, indicating whether the user should be in unauthenticated state.</returns>
        private bool ShouldForget(RefreshToken refreshTokenDetails)
        {
            const double clockSkew = 0.5; //Allows refresh upto 30 min elapse of expiry time, to keep users browse smoothly 
            //without forcing them to re-authenticate
            if (!double.TryParse(configuration["Jwt:AccessTokenExpiry"], out var accessTokenExpiry))
            {
                accessTokenExpiry = 1.0;
            };

            if ((refreshTokenDetails.RememberMeUntil != null && DateTimeOffset.UtcNow > refreshTokenDetails.RememberMeUntil)
                || (DateTimeOffset.UtcNow > refreshTokenDetails.CreateTime.AddHours(accessTokenExpiry + clockSkew)))
            {
                return true;
            }

            return false;
        }

        public async Task<LockSessionResult> LockSession(int userId, string refreshToken, string browserIdentifier)
        {
            var result = new LockSessionResult { };

            if (string.IsNullOrEmpty(refreshToken))
            {
                result = new LockSessionResult
                {
                    IsSessionLocked = false,
                    IsSignedOut = false,
                    ErrorMessage = "Empty refresh token given"
                };
            }

            try
            {
                var refreshTokenDetails = await dbContext.RefreshTokens
                    .Where(rt => rt.UserId == userId && rt.TokenString.Equals(refreshToken) &&
                     rt.BrowserIdentifier == browserIdentifier).FirstOrDefaultAsync();

                if (refreshTokenDetails != null)
                {
                    var user = await dbContext.Users.AsNoTracking()
                        .FirstOrDefaultAsync(user => user.Id == userId);


                    if (!user.SessionLockEnabled)
                    {
                        result = new LockSessionResult
                        {
                            IsSessionLocked = false,
                            IsSignedOut = false,
                            ErrorMessage = user == null ? "The account is not available" : "Session lock is not enabled"
                        };
                    }
                    else if (!refreshTokenDetails.RememberMe && ShouldForget(refreshTokenDetails))
                    {
                        result = new LockSessionResult
                        {
                            IsSessionLocked = false,
                            IsSignedOut = true,
                            ErrorMessage = "The login session is already expired"
                        };
                    }
                    else
                    {
                        refreshTokenDetails.IsSessionLocked = true;
                        await dbContext.SaveChangesAsync();

                        result = new LockSessionResult
                        {
                            IsSessionLocked = true,
                            IsSignedOut = false,
                            AccessToken = await GenerateAccessToken(user, refreshTokenDetails.TokenString)
                        };
                    }
                }
                else
                {
                    result = new LockSessionResult
                    {
                        IsSessionLocked = false,
                        IsSignedOut = false,
                        ErrorMessage = "Token not found"
                    };
                }
            }
            catch
            {
                result = new LockSessionResult
                {
                    IsSessionLocked = false,
                    IsSignedOut = false,
                    ErrorMessage = "Something went wrong"
                };
            }

            return result;
        }

        public async Task<UnlockSessionResult> UnlockSession(int userId, string refreshToken, string browserIdentifier)
        {
            var result = new UnlockSessionResult { };

            if (string.IsNullOrEmpty(refreshToken))
            {
                result = new UnlockSessionResult
                {
                    UnlockSuccess = false,
                    SignedOut = true,
                    ErrorMessage = "Empty token given"
                };
            }

            try
            {
                var refreshTokenDetails = await dbContext.RefreshTokens
                    .Where(rt => rt.UserId == userId && rt.TokenString.Equals(refreshToken) &&
                     rt.BrowserIdentifier == browserIdentifier).FirstOrDefaultAsync();

                if (refreshTokenDetails != null)
                {
                    refreshTokenDetails.IsSessionLocked = false;
                    await dbContext.SaveChangesAsync();

                    var user = await userManager.FindByIdAsync(userId.ToString());
                    result = new UnlockSessionResult
                    {
                        UnlockSuccess = true,
                        AccessToken = await GenerateAccessToken(user, refreshTokenDetails.TokenString)
                    };
                }
                else
                {
                    result = new UnlockSessionResult
                    {
                        UnlockSuccess = false,
                        SignedOut = true,
                        ErrorMessage = "Token not found"
                    };
                }
            }
            catch
            {
                result = new UnlockSessionResult
                {
                    UnlockSuccess = false,
                    SignedOut = true,
                    ErrorMessage = "Something went wrong"
                };
            }

            return result;
        }
    }
}
