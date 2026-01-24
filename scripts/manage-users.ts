import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Try to load .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key.trim()]) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
        }
    });
}

// Initialize Firebase Admin
// We need to construct the credentials object from specific env vars
// because standard GOOGLE_APPLICATION_CREDENTIALS might not be set or point to a file.
// We expect FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PROJECT_ID

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Error: Missing Firebase Admin credentials in .env');
    console.error('Required variables:');
    console.error('- FIREBASE_ADMIN_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)');
    console.error('- FIREBASE_ADMIN_CLIENT_EMAIL');
    console.error('- FIREBASE_ADMIN_PRIVATE_KEY');
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
} catch (error: any) {
    console.error('Error initializing Firebase Admin:', error.message);
    process.exit(1);
}

const auth = admin.auth();

const command = process.argv[2];
const arg = process.argv[3];

async function listUsers() {
    console.log('Fetching users...');
    try {
        let nextPageToken;
        let count = 0;

        console.log(`\n${'UID'.padEnd(30)} | ${'Email'.padEnd(35)} | ${'Verified'} | ${'Created'}`);
        console.log('-'.repeat(100));

        do {
            const listUsersResult = await auth.listUsers(1000, nextPageToken);
            listUsersResult.users.forEach((userRecord) => {
                console.log(
                    `${userRecord.uid.padEnd(30)} | ` +
                    `${(userRecord.email || 'No Email').padEnd(35)} | ` +
                    `${userRecord.emailVerified ? 'Yes' : 'No '}      | ` +
                    `${userRecord.metadata.creationTime}`
                );
                count++;
            });
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`\nTotal users: ${count}`);
    } catch (error) {
        console.error('Error listing users:', error);
    }
}

async function deleteUser(email: string) {
    if (!email) {
        console.error('Error: Please provide an email address to delete.');
        console.error('Usage: tsx scripts/manage-users.ts delete <email>');
        return;
    }

    try {
        const user = await auth.getUserByEmail(email);

        // Confirmation
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`Are you sure you want to DELETE user ${email} (UID: ${user.uid})? (yes/no): `, async (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'yes') {
                await auth.deleteUser(user.uid);
                console.log(`Successfully deleted user: ${email}`);
            } else {
                console.log('Operation cancelled.');
            }
            process.exit(0);
        });

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`Error: User with email '${email}' not found.`);
        } else {
            console.error('Error deleting user:', error);
        }
        // Don't exit here if we are in readline callback, but here we are not yet.
        // If auth.getUserByEmail fails, we go here.
    }
}

async function main() {
    switch (command) {
        case 'list':
            await listUsers();
            break;
        case 'delete':
            await deleteUser(arg);
            break;
        default:
            console.log('Usage:');
            console.log('  tsx scripts/manage-users.ts list');
            console.log('  tsx scripts/manage-users.ts delete <email>');
            break;
    }
    // For 'list' and default, we exit. 'delete' handles exit in callback.
    if (command !== 'delete') {
        process.exit(0);
    }
}

main().catch(console.error);
