import { appendFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logDir = join(tmpdir(), 'lingk-diagnostics');
const logPath = join(logDir, 'one-phone.jsonl');

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const entry = {
		receivedAt: new Date().toISOString(),
		...(body && typeof body === 'object' ? body : { body })
	};

	await mkdir(logDir, { recursive: true });
	await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
	console.info('[one-phone:server]', entry);

	return json({ ok: true });
};
