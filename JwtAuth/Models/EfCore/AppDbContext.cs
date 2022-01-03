using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JwtAuth.Models.EfCore
{
    public class AppDbContext: IdentityDbContext<User, IdentityRole<int>, int>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options): base(options)
        {

        }
        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<User>(entity =>
            {
                entity.Property(e => e.Id).UseIdentityColumn();
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(25);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(25);
                entity.Property(e => e.AddressLine1).HasMaxLength(50);
                entity.Property(e => e.AddressLine2).HasMaxLength(50);
                entity.Property(e => e.Country).HasMaxLength(50);
                entity.Property(e => e.ProfilePicUrl).HasMaxLength(150);
                entity.Property(e => e.ShortBio).HasMaxLength(1000).IsUnicode();
                entity.Property(e => e.SessionLockEnabled).IsRequired();
            });

            builder.Entity<RefreshToken>(entity => {
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.TokenString).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CreateTime).IsRequired();
                entity.Property(e => e.Expiry).IsRequired();
                entity.Property(e => e.Ip).IsRequired().HasMaxLength(64);
                entity.Property(e => e.RevokedByIp).HasMaxLength(50);
                entity.Property(e => e.RevokeReason).HasMaxLength(200);
                entity.Property(e => e.IsSessionLocked).IsRequired();
                entity.Property(e => e.RememberMe).IsRequired();
            });
        }
    }
}
