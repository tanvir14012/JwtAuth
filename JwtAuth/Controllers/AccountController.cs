using JwtAuth.Models.DTO;
using JwtAuth.Models.EfCore;
using JwtAuth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace JwtAuth.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<User> userManager;
        private readonly IAuthService authService;
        private readonly SignInManager<User> signInManager;
        private readonly IConfiguration configuration;
        private readonly static string REFRESH_TOKEN_NAME = "refreshToken";

        public AccountController(UserManager<User> userManager, IAuthService authService,
            SignInManager<User> signInManager, IConfiguration configuration)
        {
            this.userManager = userManager;
            this.authService = authService;
            this.signInManager = signInManager;
            this.configuration = configuration;
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> SignUp([FromBody] SignUp signUpModel)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    if (await userManager.FindByEmailAsync(signUpModel.Email) == null)
                    {
                        var user = new User
                        {
                            UserName = signUpModel.Email,
                            Email = signUpModel.Email,
                            FirstName = signUpModel.FirstName,
                            LastName = signUpModel.LastName
                        };

                        var createResult = await userManager.CreateAsync(user, signUpModel.Password);
                        if (createResult.Succeeded)
                        {
                            var requestInfo = new HttpRequestInfo
                            {
                                Ip = HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString(),
                                UserAgent = Request.Headers["User-Agent"].ToString()
                            };

                            var authTokens = await authService.GenerateAuthTokens(user.Id, requestInfo);
                            var cookieOps = GetCookieOptions();

                            Response.Cookies.Append(REFRESH_TOKEN_NAME, authTokens.RefreshToken.TokenString, cookieOps);

                            return Ok(new AccessToken
                            {
                                TokenString = authTokens.AccessToken
                            });
                        }
                    }
                    return Ok(new { err = $"A user already exists with email {signUpModel.Email}" });
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { err = ex.Message });
                }
                catch (SecurityTokenException ex)
                {
                    return StatusCode(406, new { err = ex.Message });
                }
                catch (Exception ex)
                {
                    return StatusCode(503, new { err = ex.Message });
                }
            }
            return BadRequest();
        }

 
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] Login loginModel)
        {
            if (ModelState.IsValid)
            {
                var user = await userManager.FindByEmailAsync(loginModel.Email ?? string.Empty);
                if (user != null)
                {
                    var isPasswordCorrect = await signInManager.UserManager.CheckPasswordAsync(user, loginModel.Password);
                    if (isPasswordCorrect)
                    {
                        try
                        {
                            var requestInfo = new HttpRequestInfo
                            {
                                Ip = HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString(),
                                UserAgent = Request.Headers["User-Agent"].ToString()
                            };

                            var authTokens = await authService.GenerateAuthTokens(user.Id, requestInfo);
                            var cookieOps = GetCookieOptions();

                            Response.Cookies.Append(REFRESH_TOKEN_NAME, authTokens.RefreshToken.TokenString, cookieOps);

                            return Ok(new AccessToken
                            {
                                TokenString = authTokens.AccessToken
                            });
                        }
                        catch (InvalidOperationException ex)
                        {
                            return BadRequest(new { err = ex.Message });
                        }
                        catch (SecurityTokenException ex)
                        {
                            return StatusCode(406, new { err = ex.Message });
                        }
                        catch (Exception ex)
                        {
                            return StatusCode(503, new { err = ex.Message });
                        }
                    }
                }

                return Ok(new AccessToken{});
            }
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(err => err.ErrorMessage).ToList();
            return BadRequest(new { err = errors });
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> RefreshUserTokens()
        {
            try
            {
                var refreshToken = Request.Cookies[REFRESH_TOKEN_NAME];
                if (string.IsNullOrEmpty(refreshToken))
                {
                    return NotFound(new { err = "A token is required" });
                }

                var requestInfo = new HttpRequestInfo
                {
                    Ip = HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString()
                };

                var authTokens = await authService.Refresh(refreshToken, requestInfo);
                var cookieOps = GetCookieOptions();

                Response.Cookies.Append(REFRESH_TOKEN_NAME, authTokens.RefreshToken.TokenString, cookieOps);

                return Ok(new AccessToken
                {
                    TokenString = authTokens.AccessToken
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { err = ex.Message });
            }
            catch (SecurityTokenValidationException ex)
            {
                Response.Cookies.Delete(REFRESH_TOKEN_NAME);
                return StatusCode(406, new { err = ex.Message}); //"Access token could not be generated from the refresh token" 
            }
            catch (Exception ex)
            {
                return StatusCode(503, new { err = ex.Message });
            }
        }


        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var refreshToken = Request.Cookies[REFRESH_TOKEN_NAME];
                if (string.IsNullOrEmpty(refreshToken))
                {
                    return BadRequest(new { error = "A token is required" });
                }

                var requestInfo = new HttpRequestInfo
                {
                    Ip = HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString()
                };

                var isRevoked = await authService.RevokeRefreshToken(refreshToken, 
                    User.FindFirstValue(ClaimTypes.NameIdentifier), requestInfo);

                Response.Cookies.Delete(REFRESH_TOKEN_NAME);

                return Ok(new { tokenRevoked = isRevoked });
            }
            catch (Exception ex)
            {
                return Ok(new { tokenRevoked = false });
            }
        }

        [HttpGet]
        public async Task<IActionResult> IsAdmin()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = await userManager.FindByIdAsync(userId);
            var userClaims = await userManager.GetClaimsAsync(user);
            return Ok(userClaims.Any(c => c.Type.Equals("Admin") && c.Value.Equals("Admin")));
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword([FromBody] PasswordChangeDTO model)
        {
            if(ModelState.IsValid)
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var user = await userManager.FindByIdAsync(userId);
                var result = await userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
                return Ok(result.Succeeded);
            }

            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(err => err.ErrorMessage).ToList();
            return BadRequest(new { err = errors });

        }


        [HttpPost]
        [Authorize(Policy = "Admin")]
        public async Task<IActionResult> ResetPassword([FromBody] PasswordResetDTO model)
        {
            if (ModelState.IsValid)
            {
                var user = await userManager.FindByIdAsync(model.UserId);
                if(user != null)
                {
                    var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
                    var result = await userManager.ResetPasswordAsync(user, resetToken, model.Password);
                    return Ok(result.Succeeded);
                }
                return Ok(false);
            }

            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(err => err.ErrorMessage).ToList();
            return BadRequest(new { err = errors });

        }

        [AllowAnonymous]
        [HttpPost]
        public IActionResult ValidateAccessToken([FromBody] string token)
        {
            var result = authService.ValidateJwtToken(token);
            return Ok(result);
        }

        private CookieOptions GetCookieOptions()
        {
            var cookieOps = new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                Expires = DateTime.UtcNow.AddHours(Convert.ToDouble(configuration["Jwt:RefresTokenExpiry"]))
            };
            return cookieOps;
        }

    }
}
