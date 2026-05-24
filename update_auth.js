const fs = require('fs');

let content = fs.readFileSync('/home/aptitek/Projets/eduquest/apps/backend/src/routes/auth.ts', 'utf8');

const replacements = [
    ['eq(users.githubEmail, primaryEmail)', 'eq(users.email, primaryEmail)'],
    ['githubName: githubUser.name || githubUser.login,', 'displayName: githubUser.name || githubUser.login,'],
    ['githubAvatar: avatarUrl,', 'githubAvatarUrl: avatarUrl,\n              avatarUrl: avatarUrl,'],
    ['githubEmail: primaryEmail,', 'email: primaryEmail,'],
    
    ['eq(users.githubEmail, mockEmail)', 'eq(users.email, mockEmail)'],
    ['githubName: mockName,', 'displayName: mockName,'],
    ['githubAvatar: mockAvatar,', 'githubAvatarUrl: mockAvatar,\n            avatarUrl: mockAvatar,'],
    ['githubEmail: mockEmail,', 'email: mockEmail,'],
    
    ['githubEmail: userPayload.githubEmail,', 'email: userPayload.email,'],
    ['githubUsername: userPayload.githubUsername,', 'githubUsername: userPayload.githubUsername,'], // unchanged
    ['githubName: userPayload.githubName,', 'displayName: userPayload.displayName,'],
    ['githubAvatar: userPayload.githubAvatar,', 'avatarUrl: userPayload.avatarUrl,\n    githubAvatarUrl: userPayload.githubAvatarUrl,'],
    
    ['userPayload.githubEmail.split', 'userPayload.email.split'],
    
    ['githubEmail: userRecord.githubEmail,', 'email: userRecord.email,'],
    ['githubName: userRecord.githubName', 'displayName: userRecord.displayName'],
    ['githubAvatar: userRecord.githubAvatar', 'avatarUrl: userRecord.avatarUrl || undefined,\n          githubAvatarUrl: userRecord.githubAvatarUrl'],
    
    ['githubName?: string;', 'displayName?: string;\n    firstName?: string;\n    lastName?: string;'],
    ['githubEmail?: string;', 'email?: string;'],
    ['githubAvatar?: string;', 'avatarUrl?: string;'],
    
    ['githubEmail: body.githubEmail || userPayload.githubEmail,', 'email: body.email || userPayload.email,'],
    ['githubName: body.githubName || userPayload.githubName,', 'displayName: body.displayName || userPayload.displayName,'],
    ['githubAvatar: body.githubAvatar || userPayload.githubAvatar,', 'avatarUrl: body.avatarUrl || userPayload.avatarUrl,\n    githubAvatarUrl: userPayload.githubAvatarUrl,'],
    
    ['body.githubEmail?.split', 'body.email?.split'],
    
    ['body.githubAvatar ||', 'body.avatarUrl ||'],
    ['userPayload.githubAvatar ||', 'userPayload.avatarUrl ||'],
    
    ['githubName: body.githubName,', 'displayName: body.displayName,\n          firstName: body.firstName,\n          lastName: body.lastName,'],
    ['githubEmail: body.githubEmail,', 'email: body.email,'],
    ['githubAvatar: body.githubAvatar,', 'avatarUrl: body.avatarUrl,'],
    
    ['githubEmail: updatedUser.githubEmail,', 'email: updatedUser.email,'],
    ['githubName: updatedUser.githubName', 'displayName: updatedUser.displayName'],
    ['githubAvatar: updatedUser.githubAvatar', 'avatarUrl: updatedUser.avatarUrl || undefined,\n          githubAvatarUrl: updatedUser.githubAvatarUrl'],
    
    ['githubEmail: userObj.githubEmail,', 'email: userObj.email,'],
    ['githubName: userObj.githubName,', 'displayName: userObj.displayName,'],
    ['githubAvatar: userObj.githubAvatar,', 'avatarUrl: userObj.avatarUrl,\n    githubAvatarUrl: userObj.githubAvatarUrl,'],
];

for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
}

fs.writeFileSync('/home/aptitek/Projets/eduquest/apps/backend/src/routes/auth.ts', content, 'utf8');
console.log('auth.ts updated.');
