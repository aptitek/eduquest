const fs = require('fs');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replaceAll(search, replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Update AccountDropdown.tsx
replaceInFile('/home/aptitek/Projets/eduquest/apps/frontend/src/components/molecules/AccountDropdown.tsx', [
    ['user.githubName || user.githubUsername || user.githubEmail.split', 'user.displayName || user.firstName || user.githubUsername || user.email.split'],
    ['user.githubAvatar ||', 'user.avatarUrl || user.githubAvatarUrl ||'],
    ['{user.githubEmail}', '{user.email}']
]);

// 2. Update fr.ts
replaceInFile('/home/aptitek/Projets/eduquest/apps/frontend/src/locales/fr.ts', [
    ["githubName: 'Nom complet',", "displayName: 'Nom d\\'affichage',"],
    ["githubEmail: 'Email GitHub principal',", "email: 'Email principal',"],
    ["githubAvatar: \"URL de l'avatar GitHub\",", "avatarUrl: \"URL de l'avatar\","]
]);

// 3. Update en.ts
replaceInFile('/home/aptitek/Projets/eduquest/apps/frontend/src/locales/en.ts', [
    ["githubName: 'Full Name',", "displayName: 'Display Name',"],
    ["githubEmail: 'Primary GitHub Email',", "email: 'Primary Email',"],
    ["githubAvatar: 'GitHub Avatar URL',", "avatarUrl: 'Avatar URL',"]
]);

console.log('Replacements complete.');
