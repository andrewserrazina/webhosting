/**
 * Cloudflare Pages Function: POST /api/contact
 * Handles website audit / project inquiry submissions.
 * See src/server/contact-handler.ts for behavior and README for configuration.
 */
import { handleContact, type ContactEnv } from '../../src/server/contact-handler';

export const onRequest: PagesFunction<ContactEnv> = (context) => handleContact(context.request, context.env);
