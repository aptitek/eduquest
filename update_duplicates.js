const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replaceAll(search, replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Update schema.ts
replaceInFile('/home/aptitek/Projets/eduquest/apps/backend/src/db/schema.ts', [
    ['  birthDate: date(\'birth_date\'),\n  internalDescription: text(\'internal_description\'), //TODO: delete\n  photoUrl: text(\'photo_url\'), //TODO delete (replaced by avatar in user table)\n  pronouns: jsonb(\'pronouns\').default(\'[]\'),\n', '']
]);

// 2. Update types.ts
replaceInFile('/home/aptitek/Projets/eduquest/packages/shared/src/types.ts', [
    ['  birthDate?: string;\n  internalDescription?: string;\n  photoUrl?: string;\n  pronouns?: string[]; // Stocké sous forme de JSONB (ex: ["He/Him", "They/Them"])\n', '']
]);

// 3. Update auth.ts - remove from students insert/update and studentObj
replaceInFile('/home/aptitek/Projets/eduquest/apps/backend/src/routes/auth.ts', [
    ['              photoUrl:\n                \'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80\', // Default in-game portrait\n              pronouns: [\'They/Them\'],\n', ''],
    ['            photoUrl: mockAvatar,\n            pronouns: [\'He/Him\'],\n', ''],
    ['    pronouns: [\'They/Them\'],\n    photoUrl:\n      \'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80\',\n', ''],
    ['          pronouns: (studentRecord.pronouns as string[]) || [],\n          photoUrl: studentRecord.photoUrl || studentObj.photoUrl,\n', ''],
    ['    pronouns: body.pronouns || [\'They/Them\'],\n    photoUrl:\n      body.photoUrl ||\n      body.avatarUrl ||\n      userPayload.avatarUrl ||\n      \'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80\',\n    birthDate: body.birthDate || null,\n    internalDescription: body.internalDescription || \'\',\n', ''],
    ['            birthDate: body.birthDate || null,\n            internalDescription: body.internalDescription,\n            photoUrl: body.photoUrl,\n            pronouns: body.pronouns || [],\n', ''],
    ['            pronouns: (updatedStudent.pronouns as string[]) || [],\n            photoUrl: updatedStudent.photoUrl || undefined,\n            birthDate: updatedStudent.birthDate || undefined,\n            internalDescription: updatedStudent.internalDescription || undefined,\n', '']
]);

console.log('Duplicates removed.');
