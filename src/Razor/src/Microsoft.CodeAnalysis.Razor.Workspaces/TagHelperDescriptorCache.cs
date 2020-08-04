// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

using Microsoft.AspNetCore.Razor.Language;

namespace Microsoft.CodeAnalysis.Razor
{
    internal static class TagHelperDescriptorCache
    {
        private static readonly MemoryCache<int, TagHelperDescriptor> CachedTagHelperDescriptors =
            new MemoryCache<int, TagHelperDescriptor>(1500);

        public static bool TryGetDescriptor(int hashCode, out TagHelperDescriptor descriptor) =>
            CachedTagHelperDescriptors.TryGetValue(hashCode, out descriptor);

        public static void Set(int hashCode, TagHelperDescriptor descriptor) =>
            CachedTagHelperDescriptors.Set(hashCode, descriptor);
    }
}