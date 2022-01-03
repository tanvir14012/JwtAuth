# JwtAuth
A Single Page App that demonstrates JWT based authentication and authorization in .NET 5 WEB API and Angular 12. 
###### Live demo: https://auth-demo.niludigital.com/

## Features
  - Account registration, login and logout. Bearer tokens (JWT access token and refresh token) are used for authenticaion.
  - Authenticated users can update their profile information, avatar and password
  - Claim based authorization
  - Users with "Admin" claim can update anyone's profile information, delete users from the app and reset anyone's password
  - Session lock (login session is locked after 5 minutes of inactivity, need to re-enter password to unlock)
  
## Technology Stack
 - C#, ASP.NET 5 WEB API, Entity Framework Core, SQL Server 2019
 - HTML & CSS, JavaScript, TypeScript
 - Angular 12, Angular Material, Bootstrap 5 (css only)
 - Visual Studio, Visual Studio Code (front-end)
 
 ## Compile and Build
 ##### Back end:
  - Create an appsettings.json similar to appsettings.Demo.json with database connection info, admin claim, JWT sigining secret and other parameters etc.
  - Update the CORS policy in Startup.cs file based on your setup. The default setup assumes the API and front-end app are hosted on different 
  servers.
  - EF Core code first approach is followed. You can run migrations in the "Package Manager Console" in Visual Studio to update the database
  . Example: To add a migration named initial: Add-Migration initial; To update the database afterwards: Update-Database.
  - Build and run the project using Visual Studio/.NET CLI
  
  ##### Front end:
  - Run "npm-install" in command line to install project dependencies (Node.js and npm must me installed on the machine)
  - Change the "API_ROOT" property from environment.ts and environment.prod.ts file. Put the address of your back end server.
  - You can install a self-signed SSL certificate using OpenSSL on the local machine for easier testing with https. Install OpenSSL on your OS, if you have
  git installed it'l already there. (For example in Windows: C:\Program Files\Git\usr\bin\openssl.exe)
  - You can run openssl.exe as administrator and paste this to create a certificate and store in a folder:
  - `req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout privateKey.key -out certificate.crt`
  
  - The following command can be used to run the front end in https where a ssl certificate is provided
   `ng serve --ssl true --ssl-key d:/selfsignedssl/privateKey.key --ssl-cert d:/selfsignedssl/certificate.crt`
  - Use https://, the browser may show a warning about SSL, ignore it and hit continue. The app should run.
  - If the front-end and the api back-end is hosted on a different servers (while testing in my case), the withCredentials option
  in src/app/http/(request and error interceptors) must be enabled for the cross site cookies to work properly 
  ```
  let requestClone = req.clone({
            withCredentials: true //uncomment it
        });
   ```
  
  ## Deploy in IIS
  - Publish the Web API project to your host. You can use the publish option in visual studio. There are many options available like folder, web deploy,
  ftp etc. If you use folder publish option, copy all contents of the "publish" folder to the root path of your site (JwtAuth\bin\Release\net5.0\publish\<all files>).
  You can use FileZilla.
  - Make a production of the front end app. You can use the following command:
  - `ng build -c production --output-path dist/wwwroot --base-href /`
  - The above command will create a wwwroot folder inside dist, copy the entire folder to your site's root path. 
  - We need to add some rewrite rules so that the Angular routing works along with the api.
  - There should be a web.config file created in the publish folder of the Web API project.
  - You may need to remove the WebDav moudle for the HTTP DELETE request in the API to work properly.
  - Update the web.config file like below to apply rewrite rules:
  ```
  <system.webServer>
	   <rewrite>
        <rules>
          <rule name="Angular Routes" stopProcessing="true">
            <match url=".*"/>
            <conditions logicalGrouping="MatchAll">
              <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true"/>
              <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true"/>
               <add input="{REQUEST_URI}" pattern="^(.*)\.[a-zA-Z]{2,4}$" negate="true" />
              <add input="{REQUEST_URI}" pattern="api/(.*)$" negate="true"/>
            </conditions>
            <action type="Rewrite" url="/"/>
          </rule>
        </rules>
       </rewrite>
	   <modules>
        <remove name="WebDAVModule" />
	  </modules>
      <handlers>
	  	<remove name="WebDAV" />
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <!-- ... other configurations -->
    </system.webServer>
  ```
  
  - The rewrite rules rewrites all requests except the API calls/static file requests to the the angular app (index.html file in wwwroot). 
  - ` <add input="{REQUEST_URI}" pattern="^(.*)\.[a-zA-Z]{2,4}$" negate="true" />`
  - The angular app requests some static files eg. JavaScript, CSS etc. from the server, those which should not be rewritten. The above rule negates the rewrite
  for such requests.
  - `<add input="{REQUEST_URI}" pattern="api/(.*)$" negate="true"/>`
  - The angular app consumes the api requests, those which should not be rewritten as well. The above rule confirms it.
  - The other rewrite rules are for file/folder requests, which which should not be rewritten as well.
  - You may have to give write permission for wwwroot/ProfilePic folder to "Application Pool Group (IWPG_(your account)". It's a good idea to 
	crate the "ProfilePic" folder after deploy and give write permission for the profile picture upload feature to work properly.
  
  ## Conclusion
  I hope you have enjoyed reading this source as much as I enjoyed writing it, and I wish you every success in your projects.
 
