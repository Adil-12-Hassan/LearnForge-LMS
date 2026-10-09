export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export const uniqueSlug = (text: string, suffix?: string): string => {
    const base = slugify(text);
    return suffix ? `${base}-${suffix}` : base;
};