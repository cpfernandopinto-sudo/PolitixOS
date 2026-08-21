import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = JSON.parse(await readFile(new URL('../n8n/instagram-pipeline-v2-shadow.json', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../supabase_migration_instagram_replies_parent.sql', import.meta.url), 'utf8');
const serialized = JSON.stringify(workflow);
const names = new Set(workflow.nodes.map((node) => node.name));

assert.equal(workflow.name, 'PolitixOS — Instagram — Pipeline V2');
assert.equal(workflow.active, false);
assert.equal(names.size, workflow.nodes.length, 'node names must be unique');
assert.ok(serialized.includes('/user/posts'));
assert.ok(serialized.includes('/post/comments'));
assert.ok(serialized.includes('/post/comment/replies'));
assert.ok(serialized.includes('https://instagram-scraper-api18.p.rapidapi.com/post'));
assert.ok(!serialized.includes('/user/reels'));
assert.ok(!serialized.includes('/media/transcript'));
assert.ok(!/openai|anthropic|gemini|embedding/i.test(serialized));
assert.ok(serialized.includes('pipeline_version'));
assert.ok(serialized.includes('calls_user_posts'));
assert.ok(serialized.includes('max_reply_pages'));
assert.ok(serialized.includes('parent_comment_id'));
assert.ok(serialized.includes('on_conflict'));
assert.ok(serialized.includes('platform,platform_post_id'));
assert.ok(serialized.includes('instagram_comment_id'));
assert.ok(!/service_role|bearer\s+[a-z0-9._-]{16,}|x-rapidapi-key\"\s*,\s*\"value/i.test(serialized));
assert.match(migration, /add column if not exists parent_comment_id uuid null/i);
assert.doesNotMatch(migration, /alter column.+set not null|drop table|truncate|delete from/i);

console.log(`PASS: ${workflow.nodes.length} nodes; V2 disabled; forbidden endpoints/AI/secrets absent; migration additive.`);
