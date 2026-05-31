import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncUserPasswords } from '../src/services/userPasswords.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

await syncUserPasswords();
console.log('Пароли пользователей обновлены.');
process.exit(0);
