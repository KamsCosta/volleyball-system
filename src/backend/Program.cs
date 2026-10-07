using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.Services;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;
using System.IO;
using System;
using System.Linq;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

// Segredos (Jwt:Secret, Email:Password) ficam no "dotnet user-secrets", fora do repositório.
// Carregado sempre, e não só em Development: sem launchSettings válido o app roda como Production.
// Como configurar numa máquina nova: docs/SEGREDOS.md
builder.Configuration.AddUserSecrets<Program>(optional: true);
if (string.IsNullOrWhiteSpace(builder.Configuration["Jwt:Secret"]))
{
    throw new InvalidOperationException(
        "Jwt:Secret não configurado. Rode em src/backend: dotnet user-secrets set \"Jwt:Secret\" \"<chave longa>\" (ver docs/SEGREDOS.md).");
}

// Controllers
builder.Services.AddControllers();
builder.Services.AddHttpClient();

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<PlayerService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<TestService>();

// Banco de dados — SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // IMPORTANTE: sem isso, o ASP.NET Core remapeia "sub" para uma URL longa
    // internamente, e User.FindFirst("sub") no controller sempre retorna null,
    // fazendo GetMe/UpdateProfile/UpdatePassword devolverem 401 mesmo com token válido.
    options.MapInboundClaims = false;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]))
    };
});

var app = builder.Build();

// Serve os vídeos enviados para análise (/uploads/videos/...) para poder reassisti-los
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

// Frontend servido pelo próprio backend: site e API no mesmo endereço.
// É isso que permite abrir pelo celular e compartilhar um link só (ver docs/ACESSO-CELULAR.md).
// O Live Server continua funcionando como antes para desenvolvimento.
var frontendPath = Path.GetFullPath(Path.Combine(
    app.Environment.ContentRootPath, builder.Configuration["Frontend:Path"] ?? "../frontend"));
if (Directory.Exists(frontendPath))
{
    app.MapGet("/", () => Results.Redirect("/login"));

    // Endereços limpos: /home em vez de /pages/home.html.
    // /pages/x.html e /x.html (gerado pelos links relativos "./x.html" das páginas)
    // redirecionam para /x; /x é servido por dentro a partir de pages/x.html.
    // Os caminhos "../css", "../js" e "../assets" continuam funcionando a partir de /x.
    var pagesPath = Path.Combine(frontendPath, "pages");
    app.Use(async (context, next) =>
    {
        var path = context.Request.Path.Value ?? "";
        var match = System.Text.RegularExpressions.Regex.Match(
            path, @"^/(?:pages/)?([a-z0-9-]+)(?:\.html)?$",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (match.Success && File.Exists(Path.Combine(pagesPath, match.Groups[1].Value + ".html")))
        {
            var name = match.Groups[1].Value;
            if (path != "/" + name)
            {
                context.Response.Redirect("/" + name + context.Request.QueryString);
                return;
            }
            context.Request.Path = "/pages/" + name + ".html";
        }
        await next();
    });

    // Login com o endereço público preenchido nas tags de prévia do link (og:image precisa
    // de URL absoluta). Atrás do túnel, o endereço real vem nos cabeçalhos X-Forwarded-*.
    app.Use(async (context, next) =>
    {
        if (!context.Request.Path.Equals("/pages/login.html", StringComparison.OrdinalIgnoreCase))
        {
            await next();
            return;
        }
        var request = context.Request;
        var scheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? request.Scheme;
        var host = request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? request.Host.Value;
        var html = await File.ReadAllTextAsync(Path.Combine(frontendPath, "pages", "login.html"));
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.WriteAsync(html.Replace("__PUBLIC_ORIGIN__", $"{scheme}://{host}"));
    });

    var contentTypes = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
    contentTypes.Mappings[".webmanifest"] = "application/manifest+json";
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath),
        ContentTypeProvider = contentTypes
    });
}

app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
