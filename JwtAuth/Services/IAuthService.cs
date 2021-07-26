using JwtAuth.Models;
using JwtAuth.Models.DTO;
using JwtAuth.Models.EfCore;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JwtAuth.Services
{
    public interface IAuthService
    {
        Task<AuthTokens> GenerateAuthTokens(string userId, HttpRequestInfo requestInfo);
        Task<AuthTokens> Refresh(string refreshToken, HttpRequestInfo requestInfo);
        Task<bool> RevokeRefreshToken(string token, string userId, HttpRequestInfo requestInfo);
        bool ValidateJwtToken(string token);
    }
}
