using JwtAuth.Models.DTO;
using JwtAuth.Models.EfCore;
using JwtAuth.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace JwtAuth.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService service;

        public ProfileController(IProfileService service)
        {
            this.service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetDetails()
        {
            try
            {
                var user = await service.Get(Convert.ToInt32(User.FindFirst(ClaimTypes.NameIdentifier).Value));
                return Ok(user);
            }
            catch
            {
                return BadRequest();
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateDetails([FromForm] UserDTO userModel)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    userModel.Id = Convert.ToInt32(User.FindFirstValue(ClaimTypes.NameIdentifier));
                    var user = await service.Update(userModel);
                    return Ok(user);
                }
                catch (Exception ex)
                {
                    var errors = new string[] { ex.Message };
                    return BadRequest(errors);
                }
            }
            var errorList = ModelState.Keys.Where(k => ModelState[k].Errors.Count > 0)
                    .Select(k => new { propertyName = k, errorMessage = ModelState[k].Errors[0].ErrorMessage })
                    .Select(k => k.errorMessage).ToArray();
            return BadRequest(errorList);
        }

        [HttpGet]
        [Authorize(Policy = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var users = await service.GetAll();
                return Ok(users);
            }
            catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        [Authorize(Policy = "Admin")]
        public async Task<IActionResult> CreateUser([FromForm] UserDTO model)
        {
            if(ModelState.IsValid)
            {
                try
                {
                    var user = await service.Create(model);
                    return Ok(user);
                }
                catch (Exception ex)
                {
                    var errors = new string[] { ex.Message };
                    return BadRequest(errors);
                }
            }

            var errorList = ModelState.Keys.Where(k => ModelState[k].Errors.Count > 0)
                    .Select(k => new { propertyName = k, errorMessage = ModelState[k].Errors[0].ErrorMessage })
                    .Select(k => k.errorMessage).ToArray();

            return BadRequest(errorList);

        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "Admin")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            try
            {
                var result = await service.Delete(id);
                return Ok(result);
            }
            catch 
            {
                return Ok(false);
            }
        }

        [HttpPost]
        [Authorize(Policy = "Admin")]
        public async Task<IActionResult> UpdateDetailsByAdmin([FromForm] UserDTO userModel)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    var user = await service.Update(userModel);
                    return Ok(user);
                }
                catch (Exception ex)
                {

                    var errors = new string[] { ex.Message };
                    return BadRequest(errors);
                }
            }

            var errorList = ModelState.Keys.Where(k => ModelState[k].Errors.Count > 0)
                    .Select(k => new { propertyName = k, errorMessage = ModelState[k].Errors[0].ErrorMessage })
                    .Select(k => k.errorMessage).ToArray();
          
            return BadRequest(errorList);
        }
    }
}
