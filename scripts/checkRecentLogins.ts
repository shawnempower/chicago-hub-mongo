/**
 * Check recent logins on the connected database (e.g. production).
 *
 * Uses MONGODB_URI from .env — point that at production to check production logins.
 *
 * Usage: npx tsx scripts/checkRecentLogins.ts [--sessions] [--limit N]
 *   --sessions   also list recent sessions from user_sessions
 *   --limit N    max users/sessions to show (default 20)
 */

import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { connectToDatabase, getDatabase } from '../src/integrations/mongodb/client';
import { COLLECTIONS } from '../src/integrations/mongodb/schemas';

const args = process.argv.slice(2);
const showSessions = args.includes('--sessions');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : 20;

async function checkRecentLogins() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectToDatabase();
    const db = getDatabase();
    console.log('✅ Connected.\n');

    const usersCol = db.collection(COLLECTIONS.USERS);
    const sessionsCol = db.collection(COLLECTIONS.USER_SESSIONS);

    // Users who have ever logged in (lastLoginAt set), most recent first
    const usersWithLogin = await usersCol
      .find({ lastLoginAt: { $exists: true, $ne: null } })
      .sort({ lastLoginAt: -1 })
      .limit(limit)
      .project({ email: 1, firstName: 1, lastName: 1, lastLoginAt: 1, role: 1 })
      .toArray();

    console.log('👤 Recent logins (users with lastLoginAt, most recent first):');
    console.log('='.repeat(70));
    if (usersWithLogin.length === 0) {
      console.log('   No users with lastLoginAt found.');
    } else {
      for (const u of usersWithLogin) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
        const at = u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '—';
        console.log(`   ${u.email}  |  ${name}  |  ${at}  |  role: ${u.role || 'standard'}`);
      }
    }

    if (showSessions) {
      const sessions = await sessionsCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      console.log('\n🔐 Recent sessions (user_sessions, most recent first):');
      console.log('='.repeat(70));
      if (sessions.length === 0) {
        console.log('   No sessions found.');
      } else {
        const userIds = [...new Set(sessions.map((s: { userId: string }) => s.userId))];
        const validIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
        const userMap = new Map<string, { email?: string }>();
        const users = validIds.length
          ? await usersCol.find({ _id: { $in: validIds } }).toArray()
          : [];
        for (const u of users as { _id: unknown; email?: string }[]) {
          userMap.set(String(u._id), { email: u.email });
        }
        for (const s of sessions) {
          const email = userMap.get(s.userId)?.email ?? s.userId;
          const created = s.createdAt ? new Date(s.createdAt).toISOString() : '—';
          const expires = s.expiresAt ? new Date(s.expiresAt).toISOString() : '—';
          console.log(`   ${email}  |  created: ${created}  |  expires: ${expires}`);
        }
      }
    }

    console.log('');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkRecentLogins();
