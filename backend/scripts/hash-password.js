import bcrypt from 'bcryptjs';

const hash = bcrypt.hashSync(process.argv[2] || 'password123', 10);
console.log(hash);
