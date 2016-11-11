﻿// Copyright (c) Source Tree Solutions, LLC. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Author:					Joe Audette
// Created:					2016-09-02
// Last Modified:			2016-11-09
// 

using cloudscribe.SimpleContent.Storage.EFCore.Common;
using cloudscribe.SimpleContent.Storage.EFCore.MySQL;
using Microsoft.EntityFrameworkCore;
//using MySQL.Data.EntityFrameworkCore;
//using MySQL.Data.EntityFrameworkCore.Extensions;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class SimpleContentEFMSSQLServiceCollectionExtensions
    {

        public static IServiceCollection AddCloudscribeSimpleContentEFStorageMySQL(
            this IServiceCollection services,
            string connectionString
            )
        {
            services.AddEntityFrameworkMySql()
                .AddDbContext<SimpleContentDbContext>((serviceProvider, options) =>
                options.UseMySql(connectionString)
                       .UseInternalServiceProvider(serviceProvider)
                       );

            services.AddScoped<ISimpleContentDbContext, SimpleContentDbContext>();

            services.AddCloudscribeSimpleContentEFStorageCommon();
            
            return services;
        }

    }
}
