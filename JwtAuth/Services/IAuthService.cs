using JwtAuth.Models.DTO;
using JwtAuth.Models.EfCore;
using System.Threading.Tasks;

namespace JwtAuth.Services
{
    public interface IAuthService
    {
        Task<AuthTokens> GenerateAuthTokens(User user, bool rememberMe, HttpRequestInfo requestInfo);
        Task<TokenRefreshResult> Refresh(string refreshToken, string browserIdentifier, HttpRequestInfo requestInfo);
        Task<bool> RevokeRefreshToken(string token, int userId, HttpRequestInfo requestInfo);
        Task<LockSessionResult> LockSession(int userId, string refreshToken, string browserIdentifier);
        Task<UnlockSessionResult> UnlockSession(int userId, string refreshToken, string browserIdentifier);
    }
}
