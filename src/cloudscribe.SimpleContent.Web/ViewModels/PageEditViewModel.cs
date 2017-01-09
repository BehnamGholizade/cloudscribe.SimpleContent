﻿namespace cloudscribe.SimpleContent.Web.ViewModels
{
    public class PageEditViewModel
    {
        public string Id { get; set; } = string.Empty;

        public string ProjectId { get; set; } = string.Empty;

        public string ParentId { get; set; } = "0";
        public string ParentSlug { get; set; } = string.Empty;
        
        public int PageOrder { get; set; } = 3;

        public string Title { get; set; } = string.Empty;

        public string Author { get; set; } = string.Empty;

        public string Slug { get; set; } = string.Empty;

        public string MetaDescription { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public string ViewRoles { get; set; } = string.Empty;

        public string PubDate { get; set; } = string.Empty;

        
        public bool IsPublished { get; set; } = true;

        public bool ShowHeading { get; set; } = true;

        public bool MenuOnly { get; set; } = false;

    }
}
