import z from 'zod';
import { blankIsUnset } from '../schema/helpers.js';

/** The upload a create request attaches to the product; a blank reads as no photo. */
export const productImageSchema = z.string().trim().transform(blankIsUnset).optional();
