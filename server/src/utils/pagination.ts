export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export const getPagination = (params: PaginationParams) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

export const buildPaginationMeta = (
    page: number,
    limit: number,
    total: number
): PaginationMeta => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});