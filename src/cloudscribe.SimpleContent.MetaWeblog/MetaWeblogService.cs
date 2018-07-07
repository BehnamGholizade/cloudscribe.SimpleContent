﻿// Copyright (c) Source Tree Solutions, LLC. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Author:                  Joe Audette
// Created:                 2016-02-08
// Last Modified:           2018-07-07
// 

using cloudscribe.SimpleContent.Models;
using cloudscribe.MetaWeblog;
using cloudscribe.MetaWeblog.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace cloudscribe.SimpleContent.MetaWeblog
{
    public class MetaWeblogService : IMetaWeblogService
    {

        public MetaWeblogService(
            IProjectService projectService,
            IProjectSecurityResolver security,
            IContentHistoryCommands contentHistoryCommands,
            ILogger<MetaWeblogService> logger,
            IBlogService blogService = null,
            IPageService pageService = null
            )
        {
            _projectService = projectService;
            _security = security;
            _contentHistoryCommands = contentHistoryCommands;
            _blogService = blogService ?? new NotImplementedBlogService();
            _pageService = pageService ?? new NotImplementedPageService();
            _mapper = new MetaWeblogModelMapper();
            _log = logger;
            
        }

        private readonly IProjectService _projectService;
        private readonly IProjectSecurityResolver _security;
        private readonly IContentHistoryCommands _contentHistoryCommands;
        private readonly IBlogService _blogService;
        private readonly IPageService _pageService;
        private readonly MetaWeblogModelMapper _mapper;
        private readonly ILogger _log;

        public async Task<string> NewPost(
            string blogId,
            string userName,
            string password,
            PostStruct newPost,
            bool publish,
            string authorDisplayName
            )
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if (!permission.CanEditPosts)
            {
                _log.LogWarning($"rejecting new post because user {userName} cannot edit posts");
                return null;
            }

            var post = _mapper.GetPostFromStruct(newPost);
            post.BlogId = blogId;
            post.Id = Guid.NewGuid().ToString();
            post.Author = authorDisplayName;
            if(publish)
            {
                post.IsPublished = true;
                if (post.IsPublished) { post.PubDate = DateTime.UtcNow; }
            }
            else
            {
                //new draft
                post.DraftAuthor = post.Author;
                post.DraftContent = post.Content;
                post.Content = null;
            }
            
            var convertToRelativeUrls = true;

            await _blogService.Create(post, convertToRelativeUrls).ConfigureAwait(false);
            if (publish)
            {
                await _blogService.FirePublishEvent(post);
            }

            return post.Id; 
        }

        public async Task<bool> EditPost(
            string blogId,
            string postId,
            string userName,
            string password,
            PostStruct post,
            bool publish)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if (!permission.CanEditPosts)
            {
                _log.LogWarning($"rejecting new post because user {userName} cannot edit posts");
                return false;
            }

            var existing = await _blogService.GetPost(postId).ConfigureAwait(false);
            
            if (existing == null)
            {
                _log.LogError($"post not found for id {postId}");
                return false;
            }
            var history = existing.CreateHistory(userName);

            if(!string.IsNullOrWhiteSpace(existing.TemplateKey))
            {
                _log.LogError($"post {postId} uses a content template and cannot be edited via metaweblog api");
                return false;
            }
            if (existing.ContentType != ProjectConstants.HtmlContentType)
            {
                _log.LogError($"post {postId} uses a content type {existing.ContentType} and cannot be edited via metaweblog api");
                return false;
            }

            var update = _mapper.GetPostFromStruct(post);

            existing.Title = update.Title;
            existing.MetaDescription = update.MetaDescription;
           
            if (!string.Equals(existing.Slug, update.Slug, StringComparison.OrdinalIgnoreCase))
            {
                // slug changed make sure the new slug is available
                var requestedSlug = ContentUtils.CreateSlug(update.Slug);
                var available = await _blogService.SlugIsAvailable(blogId, requestedSlug).ConfigureAwait(false);

                if (available)
                {
                    existing.Slug = requestedSlug;
                }
            }
               
            existing.Categories = update.Categories;
            
            if(existing.HasPublishedVersion())
            {
                if(publish)
                {
                    existing.Content = update.Content;
                }
                else
                {
                    //new draft
                    existing.DraftContent = update.Content;
                }
            }
            else
            {
                if(publish)
                {
                    existing.Content = update.Content;
                    existing.IsPublished = true;
                    if(!existing.PubDate.HasValue)
                    {
                        existing.PubDate = DateTime.UtcNow;
                    }
                    existing.DraftAuthor = null;
                    existing.DraftContent = null;
                    existing.DraftPubDate = null;
                }
                else
                {
                    existing.DraftContent = update.Content;
                }  
            }

            var convertToRelativeUrls = true;

            await _blogService.Update(existing, convertToRelativeUrls).ConfigureAwait(false);
            await _contentHistoryCommands.Create(blogId, history);
            if(publish)
            {
                await _blogService.FirePublishEvent(existing);
            }

            return true;
        }

        public async Task<PostStruct> GetPost(
            string blogId,
            string postId,
            string userName,
            string password,
            CancellationToken cancellationToken)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if (!permission.CanEditPosts)
            {
                _log.LogWarning($"user {userName} cannot edit posts");
                return new PostStruct(); 
            }

            var existing = await _blogService.GetPost(postId).ConfigureAwait(false);
            
            if (existing == null) { return new PostStruct(); }

            var commentsOpen = await _blogService.CommentsAreOpen(existing, false);
            var postUrl = await _blogService.ResolvePostUrl(existing);
            
            var postStruct = _mapper.GetStructFromPost(existing,postUrl, commentsOpen);
            // OLW/WLW need the image urls to be fully qualified - actually not sure this is true
            // I seem to remember that being the case with WLW
            // but when I open a recent post in olw that orignated from the web client
            // it shows the image correctly in olw
            // we persist them as relative so we need to convert them back
            // before passing posts back to metaweblogapi

            return postStruct;

        }

        public async Task<List<CategoryStruct>> GetCategories(
            string blogId,
            string userName,
            string password,
            CancellationToken cancellationToken)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            List<CategoryStruct> output = new List<CategoryStruct>();

            if(permission.CanEditPosts)
            {
                var cats = await _blogService.GetCategories(permission.CanEditPosts).ConfigureAwait(false);
                
                foreach (var c in cats)
                {
                    CategoryStruct s = new CategoryStruct { title = c.Key };
                    output.Add(s);
                }
            }
            else
            {
                _log.LogWarning($"user {userName} cannot edit posts");
            }
            

            return output;
        }

        public async Task<List<PostStruct>> GetRecentPosts(
            string blogId,
            string userName,
            string password,
            int numberOfPosts,
            CancellationToken cancellationToken)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            var structs = new List<PostStruct>();

            if(permission.CanEditPosts)
            {
                var blogPosts = await _blogService.GetRecentPosts(numberOfPosts).ConfigureAwait(false);
                
                foreach (Post p in blogPosts)
                {
                    var commentsOpen = await _blogService.CommentsAreOpen(p, false);
                    var postUrl = await _blogService.ResolvePostUrl(p);

                    var s = _mapper.GetStructFromPost(p, postUrl, commentsOpen);

                    // OLW/WLW need the image urls to be fully qualified - actually not sure this is true
                    // I seem to remember that being the case with WLW
                    // but when I open a recent post in olw that orignated from the web client
                    // it shows the image correctly in olw
                    // we persist them as relative so we need to convert them back
                    // before passing posts back to metaweblogapi

                    structs.Add(s);
                }
            }
            else
            {
                _log.LogWarning($"user {userName} cannot edit posts");
            }
            
            return structs;
        }

        public async Task<MediaInfoStruct> NewMediaObject(
            string blogId,
            string userName,
            string password,
            MediaObjectStruct mediaObject)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if(!permission.CanEditPosts)
            {
                _log.LogWarning($"user {userName} cannot edit posts");
                return new MediaInfoStruct();
            }

            string extension = Path.GetExtension(mediaObject.name);
            //string fileName = Guid.NewGuid().ToString() + extension;
            string fileName = Path.GetFileName(mediaObject.name).ToLowerInvariant().Replace("_thumb", "-wlw");

            await _blogService.SaveMedia(
                blogId, 
                mediaObject.bytes, 
                fileName
                ).ConfigureAwait(false);

            var mediaUrl = await _blogService.ResolveMediaUrl(fileName); ;
            var result = new MediaInfoStruct() { url = mediaUrl };

            return result;
        }

        public async Task<bool> DeletePost(
            string blogId, 
            string postId,
            string userName,
            string password
            )
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if(!permission.CanEditPosts)
            {
                _log.LogWarning($"user {userName} cannot edit posts");
                return false;
            }

            var post = await _blogService.GetPost(postId);
            if(post == null)
            {
                _log.LogError($"post was null for id {postId}");

                return false;
            }

            var history = post.CreateHistory(userName);
            await _contentHistoryCommands.Create(blogId, history);

            await _blogService.Delete(postId);

            return true;
        }
        
        public async Task<List<BlogInfoStruct>> GetUserBlogs(
            string key, 
            string userName,
            string password,
            CancellationToken cancellationToken)
        {
            var result = new List<BlogInfoStruct>();

            var permission = await _security.ValidatePermissions(
                string.Empty,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);
            
            if (!permission.CanEditPosts)
            {
                _log.LogWarning($"user {userName} cannot edit posts");
                return result; //empty
            }

            var project = await _projectService.GetCurrentProjectSettings();
            if(project == null)
            {
                _log.LogError($"could not resolve project settings");
                return result; //empty
            }

            var url = await _blogService.ResolveBlogUrl(project).ConfigureAwait(false);
            var b = _mapper.GetStructFromBlog(project, url);
            
            return result;
        }

        public Task<string> NewCategory(
            string blogId, 
            string category,
            string userName,
            string password
            )
        {
            //TODO: implement

            throw new NotImplementedException();
        }

        public async Task<List<PageStruct>> GetPages(
            string blogId,
            string userName,
            string password,
            CancellationToken cancellationToken)
        {
            var list = new List<PageStruct>();

            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if(!permission.CanEditPages)
            {
                _log.LogWarning($"user {userName} cannot edit pages");
                return list;
            }

            var pages = await _pageService.GetAllPages(blogId).ConfigureAwait(false);

            foreach (var p in pages)
            {
                //var commentsOpen = await blogService.CommentsAreOpen(p, false);
                var postUrl = await _pageService.ResolvePageUrl(p);

                var s = _mapper.GetStructFromPage(p, postUrl, false);

                // OLW/WLW need the image urls to be fully qualified - actually not sure this is true
                // I seem to remember that being the case with WLW
                // but when I open a recent post in olw that orignated from the web client
                // it shows the image correctly in olw
                // we persist them as relative so we need to convert them back
                // before passing posts back to metaweblogapi

                list.Add(s);
            }

            //return structs;

            //var list = new List<PageStruct>();

            return list;
        }

        public async Task<List<PageStruct>> GetPageList(
            string blogId,
            string userName,
            string password,
            CancellationToken cancellationToken)
        {
            var list = new List<PageStruct>();

            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if (!permission.CanEditPages)
            {
                _log.LogWarning($"user {userName} cannot edit pages");
                return list;
            }

            var pages = await _pageService.GetAllPages(blogId).ConfigureAwait(false);
            
            foreach (var p in pages)
            {
                //var commentsOpen = await blogService.CommentsAreOpen(p, false);
                var postUrl = await _pageService.ResolvePageUrl(p);

                var s = _mapper.GetStructFromPage(p, postUrl, false);

                // OLW/WLW need the image urls to be fully qualified - actually not sure this is true
                // I seem to remember that being the case with WLW
                // but when I open a recent post in olw that orignated from the web client
                // it shows the image correctly in olw
                // we persist them as relative so we need to convert them back
                // before passing posts back to metaweblogapi

                list.Add(s);
            }

            //return structs;

            //var list = new List<PageStruct>();

            return list;
            
        }

        public async Task<PageStruct> GetPage(
            string blogId, 
            string pageId,
            string userName,
            string password,
            CancellationToken cancellationToken)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if(!permission.CanEditPages)
            {
                _log.LogWarning($"user {userName} cannot edit pages");
                return new PageStruct();
            }

            var existing = await _pageService.GetPage(pageId).ConfigureAwait(false);

            if (existing == null) { return new PageStruct(); }

            //var commentsOpen = await blogService.CommentsAreOpen(existing, false);
            var commentsOpen = false;
            var pageUrl = await _pageService.ResolvePageUrl(existing);

            var pageStruct = _mapper.GetStructFromPage(existing, pageUrl, commentsOpen);
            // OLW/WLW need the image urls to be fully qualified - actually not sure this is true
            // I seem to remember that being the case with WLW
            // but when I open a recent post in olw that orignated from the web client
            // it shows the image correctly in olw
            // we persist them as relative so we need to convert them back
            // before passing posts back to metaweblogapi

            return pageStruct;
        }

        public async Task<string> NewPage(
            string blogId,
            string userName,
            string password,
            PageStruct newPage, 
            bool publish)
        {
            var permission = await _security.ValidatePermissions(
                blogId,
                userName,
                password,
                CancellationToken.None
                ).ConfigureAwait(false);

            if (!permission.CanEditPages)
            {
                _log.LogWarning($"user {userName} cannot edit pages");
                return null;
            }

            var page = _mapper.GetPageFromStruct(newPage);

            page.ProjectId = blogId;
            page.Id = Guid.NewGuid().ToString();
            if(publish)
            {
                page.IsPublished = publish;
                page.PubDate = DateTime.UtcNow;
            }
            else
            {

            }
            
            await _pageService.Create(
                blogId, 
                userName,
                password,
                page, 
                publish
                ).ConfigureAwait(false);

            return page.Id;
            
        }

        public async Task<bool> EditPage(
            string blogId, 
            string pageId,
            string userName,
            string password,
            PageStruct page, 
            bool publish)
        {
            var existing = await _pageService.GetPage(
                blogId, 
                pageId,
                userName,
                password
                ).ConfigureAwait(false);
            if(existing == null) { return false; }

            var update = _mapper.GetPageFromStruct(page);
            existing.Content = update.Content;
            existing.PageOrder = update.PageOrder;
            existing.ParentId = update.ParentId;
            existing.Title = update.Title;
            
            await _pageService.Update(
                blogId, 
                userName,
                password,
                existing, 
                publish
                ).ConfigureAwait(false);

            return true;
        }

        public Task<bool> DeletePage(
            string blogId, 
            string pageId,
            string userName,
            string password
            )
        {
            //TODO: implement
            //return await blogService.Delete(blogId, postId);
            throw new NotImplementedException();
        }
    }
}
