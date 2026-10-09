import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { categoryService } from '../services/category.service.js';
import { z } from 'zod';

const routeParam = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value[0] ?? '' : value ?? '';

const createSchema = z.object({
    name: z.string().min(2).max(50),
    description: z.string().optional(),
    parentId: z.string().optional(),
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await categoryService.getTree();
    return sendSuccess(res, categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, parentId } = createSchema.parse(req.body);
    const category = await categoryService.create(name, description, parentId);
    return sendSuccess(res, category, 201);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const id = routeParam(req.params.id);
    if (!id) return sendError(res, 'Category ID is required', 400);
    const data = z.object({
        name: z.string().min(2).max(50).optional(),
        description: z.string().optional(),
    }).parse(req.body);
    const category = await categoryService.update(id, data);
    return sendSuccess(res, category);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const id = routeParam(req.params.id);
    if (!id) return sendError(res, 'Category ID is required', 400);
    await categoryService.delete(id);
    return sendSuccess(res, { message: 'Category deleted' });
});
