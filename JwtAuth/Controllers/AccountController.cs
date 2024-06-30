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
        private readonly static string REFRESH_TOKEN_NAME = "refreshToken",
                                       BROWSER_IDENTIFIER = "browserIdentifier";

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
                            UserName = signUpModel.Email.Split("@")[0],
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

                            var authTokens = await authService.GenerateAuthTokens(user, true, requestInfo);
                            var cookieOps = GetCookieOptions(1);
                            Response.Cookies.Append(REFRESH_TOKEN_NAME, authTokens.RefreshToken.TokenString, cookieOps);
                            //Store a cookie to recognize the browser.
                            var browserIdentifierCookieOps = GetCookieOptions(2);
                            Response.Cookies.Append(BROWSER_IDENTIFIER, authTokens.BrowserIdentifier, browserIdentifierCookieOps);

                            return Ok(new SigninResult { 
                                AccessToken = authTokens.AccessTokenDTO,
                                Succeeded = true,
                                
                            });

                        }
                    }
                    return Ok(new SigninResult { 
                        ErrorMessage = $"A user already exists with email {signUpModel.Email}",
                        Succeeded = false
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
            return BadRequest();
        }

 
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Signin(SigninModel signinModel)
        {
            var signinResult = new SigninResult { };

            if (ModelState.IsValid)
            {
                var user = await userManager.FindByEmailAsync(signinModel.Email ?? string.Empty);
                if (user != null)
                {

                    var identitySignInResult = await signInManager
                        .CheckPasswordSignInAsync(user, signinModel.Password, true);


                    if (identitySignInResult.Succeeded)
                    {
                        try
                        {
                            var requestInfo = new HttpRequestInfo
                            {
                                Ip = HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString(),
                                UserAgent = Request.Headers["User-Agent"].ToString()
                            };

                            var authTokens = await authService.GenerateAuthTokens(user, signinModel.RememberMe, requestInfo);
                            var cookieOps = GetCookieOptions(1);
                            Response.Cookies.Append(REFRESH_TOKEN_NAME, authTokens.RefreshToken.TokenString, cookieOps);

                            if (signinModel.RememberMe)
                            {
                                //Store a cookie to recognize the browser.
                                var browserIdentifierCookieOps = GetCookieOptions(2);
                                Response.Cookies.Append(BROWSER_IDENTIFIER, authTokens.BrowserIdentifier, browserIdentifierCookieOps);
                            }


                            signinResult.Succeeded = true;
                            signinResult.AccessToken = authTokens.AccessTokenDTO;
                            return Ok(signinResult);
                        }
                        catch (Exception ex)
                        {
                            signinResult.Succeeded = false;
                            signinResult.ErrorMessage = "Something went wrong, please contact support";
                            return Ok(signinResult);
                        }
                    }
                    else if (identitySignInResult.IsLockedOut)
                    {
                        signinResult.AccountLocked = true;
                        signinResult.Succeeded = false;
                        signinResult.ErrorMessage = "Your account has been locked temporarily because of too many failed " +
                            "login attempts. Please try again after " + Math.Ceiling(user.LockoutEnd.Value.Subtract(DateTime.UtcNow).TotalMinutes) + " minutes";
                        return Ok(signinResult);
                    }
                    else if (identitySignInResult.IsNotAllowed)
                    {
                        signinResult.ConfirmationRequired = true;
                        signinResult.Succeeded = false;
                        signinResult.ErrorMessage = "Your email address is not verified";
                        return Ok(signinResult);
                    }
                }

                signinResult.Succeeded = false;
                signinResult.ErrorMessage = "Incorrect email or password";
                return Ok(signinResult);
            }

            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(err => err.ErrorMessage).ToList();
            signinResult.Succeeded = false;
            signinResult.ValidationFailed = true;
            signinResult.ErrorMessage = string.Join("|", errors);
            return Ok(signinResult);
        }

        /// <summary>
        /// Generates a new access token from the refresh token, it is assumed to be set as a http only cookie.
        /// Refresh token is rotated at each refresh.
        /// </summary>
        /// <returns>A <c>TokenRefreshResult</c> object.</returns>
        [AllowAnonymous]
        [HttpPost]

        public async Task<IActionResult> RefreshUserTokens()
        {
            string refreshToken = Request.Cookies[REFRESH_TOKEN_NAME],
                browserIdentifier = Request.Cookies[BROWSER_IDENTIFIER];

            var requestInfo = new HttpRequestInfo
            {
                Ip = HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            };

            var refreshResult = await authService.Refresh(refreshToken, browserIdentifier, requestInfo);

            //Delete cookies and sign out
            if (refreshResult.SignedOut)
            {
                DeleteRefreshTokenAndBrowserIdentifierCookies();
            }
            else if (refreshResult.RefreshSucceeded)
            {
                var refreshTokenCookieOps = GetCookieOptions(1);
                Response.Cookies.Append(REFRESH_TOKEN_NAME, refreshResult.RefreshToken, refreshTokenCookieOps);
            }
            //Do not post failure info and refresh token to response body, it's for debugging purpose.
            refreshResult.FailureReason = null;
            refreshResult.RefreshToken = null;
            return Ok(refreshResult);
        }

        /// <summary>
        /// Check if the access token is valid.
        /// </summary>
        [Authorize]
        [HttpGet]
        public IActionResult CheckAccessTokenValidity()
        {
            return Ok();
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


        [HttpPost]
        public async Task<IActionResult> Signout()
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

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var isRevoked = await authService.RevokeRefreshToken(refreshToken,
                    Convert.ToInt32(userId), requestInfo);

                DeleteRefreshTokenAndBrowserIdentifierCookies();

                return Ok();
            }
            catch (Exception ex)
            {
                return Ok();
            }
        }

        /// <summary>
        /// Setup for http only cookie options.
        /// </summary>
        /// <param name="type">For refresh token type is 1, for browser identifier type is 2</param>
        /// <returns>A <c>CookieOptions</c> object.</returns>
        private CookieOptions GetCookieOptions(short type)
        {
            var cookieOps = new CookieOptions
            {
                HttpOnly = true,
                IsEssential = true,
                Secure = true, 
                SameSite = SameSiteMode.None, //for testing only in localhost
            };

            if (type == 1)
            {
                cookieOps.Expires = DateTimeOffset.UtcNow.AddHours(Convert.ToDouble(configuration["Jwt:RefreshTokenExpiry"]));
            }
            else if (type == 2)
            {
                cookieOps.Expires = DateTimeOffset.UtcNow.AddYears(1);
            }
            return cookieOps;
        }

        /// <summary>
        /// Request to lock a specific login session because of inactivity from client side. This operation depends
        /// on the browser identifier cookie.
        /// </summary>
        /// <returns>a <c>LockSessionResultDTO</c> object, describes the outcome.</returns>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> LockSession()
        {
            string refreshToken = Request.Cookies[REFRESH_TOKEN_NAME],
                   browserIdentifier = Request.Cookies[BROWSER_IDENTIFIER];

            int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId);

            var lockSessionResult = await authService.LockSession(userId, refreshToken, browserIdentifier);
            if (lockSessionResult.IsSignedOut)
            {
                DeleteRefreshTokenAndBrowserIdentifierCookies();
            }

            return Ok(lockSessionResult);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> UnlockSession(Password password)
        {
            if (ModelState.IsValid)
            {
                string refreshToken = Request.Cookies[REFRESH_TOKEN_NAME],
                  browserIdentifier = Request.Cookies[BROWSER_IDENTIFIER];

                int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId);


                var user = await userManager.FindByIdAsync(userId.ToString());
                if (user != null)
                {
                    bool passwordValid = await userManager.CheckPasswordAsync(user, password.Value);
                    if (passwordValid)
                    {
                        var result = await authService.UnlockSession(userId, refreshToken, browserIdentifier);
                        if (result.SignedOut)
                        {
                            DeleteRefreshTokenAndBrowserIdentifierCookies();
                        }
                        return Ok(result);
                    }

                    return Ok(new UnlockSessionResult
                    {
                        UnlockSuccess = false,
                        ErrorMessage = "Password is incorrect"
                    });
                }
                else
                {
                    DeleteRefreshTokenAndBrowserIdentifierCookies();
                    return Ok(new UnlockSessionResult
                    {
                        UnlockSuccess = false,
                        SignedOut = true
                    });
                }
            }

            return Ok(new UnlockSessionResult
            {
                UnlockSuccess = false,
                ErrorMessage = "Password is incorrect"
            });
        }

        private void DeleteRefreshTokenAndBrowserIdentifierCookies()
        {
            Response.Cookies.Delete(REFRESH_TOKEN_NAME);
            Response.Cookies.Delete(BROWSER_IDENTIFIER);
        }

    }
}
