import { useState, useEffect } from 'react';
import { EditableCard } from '../EditableCard';
import { EditableText } from '../../atoms/EditableText';
import { EditableAvatar } from '../../molecules/EditableAvatar';
import { User } from '@eduquest/shared';
import { Github, Shield, GraduationCap } from 'lucide-react';

export interface InstitutionalProfileCardProps {
  user: User;
  onUpdateProfile: (data: Partial<User>) => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
  onResetAvatar?: () => Promise<void>;
  className?: string;
}

export function InstitutionalProfileCard({
  user,
  onUpdateProfile,
  onUploadAvatar,
  onResetAvatar,
  className,
}: InstitutionalProfileCardProps) {
  const [draft, setDraft] = useState<Partial<User>>({});

  useEffect(() => {
    setDraft({});
  }, [user]);

  const handleChange = (key: keyof User, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(draft).length > 0) {
      await onUpdateProfile(draft);
      setDraft({});
    }
  };

  const handleCancel = () => {
    setDraft({});
  };

  const currentData = { ...user, ...draft };

  const computedDisplayName =
    currentData.displayName ||
    (currentData.firstName && currentData.lastName
      ? `${currentData.firstName} ${currentData.lastName}`
      : currentData.githubUsername) ||
    '';

  return (
    <EditableCard
      title="Institutional Profile"
      onSave={handleSave}
      onCancel={handleCancel}
      className={className || "max-w-3xl w-full mx-auto font-body"}
      renderAvatar={(isEditing) => (
        <EditableAvatar
          src={currentData.avatarUrl || currentData.githubAvatarUrl || ''}
          githubFallbackSrc={user.githubAvatarUrl || ''}
          isEditing={isEditing}
          onUpload={async (file) => {
            if (onUploadAvatar) await onUploadAvatar(file);
          }}
          onReset={async () => {
            if (onResetAvatar) await onResetAvatar();
            else await onUpdateProfile({ avatarUrl: user.githubAvatarUrl });
          }}
        />
      )}
      renderHeader={() => (
        <div className="flex flex-col gap-2 mt-1">
          <div className="text-xl font-display font-bold text-base-content">
            {computedDisplayName}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {user.githubUsername && (
              <div className="badge badge-neutral gap-1 text-xs py-3 px-3 font-medium shadow-sm">
                <Github size={14} />
                {user.githubUsername}
              </div>
            )}
            <div className={`badge ${user.isAdmin ? 'badge-primary' : 'badge-ghost'} gap-1 text-xs py-3 px-3 font-medium shadow-sm`}>
              <Shield size={14} />
              {user.isAdmin ? 'Administrator' : 'Student'}
            </div>
            <div className="badge badge-outline gap-1 text-xs py-3 px-3 font-medium shadow-sm bg-base-100">
              <GraduationCap size={14} />
              EduQuest Academy
            </div>
          </div>
        </div>
      )}
      renderFields={(isEditing) => (
        <div className="flex flex-col gap-6 mt-4 border-t border-base-200 pt-6">
          
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-base-content/60">
            Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70 font-semibold uppercase">First Name</span>
              </label>
              {isEditing ? (
                <EditableText
                  value={currentData.firstName || ''}
                  onChange={(v) => handleChange('firstName', v)}
                  placeholder="First Name"
                />
              ) : (
                <span className="text-sm font-medium px-1 py-1">{user.firstName || '-'}</span>
              )}
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70 font-semibold uppercase">Last Name</span>
              </label>
              {isEditing ? (
                <EditableText
                  value={currentData.lastName || ''}
                  onChange={(v) => handleChange('lastName', v)}
                  placeholder="Last Name"
                />
              ) : (
                <span className="text-sm font-medium px-1 py-1">{user.lastName || '-'}</span>
              )}
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70 font-semibold uppercase">Display Name</span>
              </label>
              {isEditing ? (
                <EditableText
                  value={currentData.displayName || ''}
                  onChange={(v) => handleChange('displayName', v)}
                  placeholder="Display Name"
                />
              ) : (
                <span className="text-sm font-medium px-1 py-1">{user.displayName || '-'}</span>
              )}
            </div>
          </div>

          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-base-content/60 mt-2">
            Contact & Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control md:col-span-1">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70 font-semibold uppercase">Email</span>
              </label>
              {isEditing ? (
                <input
                  type="email"
                  className="input input-bordered input-sm focus:outline-none w-full"
                  value={currentData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              ) : (
                <span className="text-sm font-medium px-1 py-1">{user.email || '-'}</span>
              )}
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70 font-semibold uppercase">Birth Date</span>
              </label>
              {isEditing ? (
                <input
                  type="date"
                  className="input input-bordered input-sm focus:outline-none w-full"
                  value={currentData.birthDate || ''}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                />
              ) : (
                <span className="text-sm font-medium px-1 py-1">{user.birthDate || '-'}</span>
              )}
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70 font-semibold uppercase">Pronouns</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="input input-bordered input-sm focus:outline-none w-full"
                  value={currentData.pronouns || ''}
                  onChange={(e) => handleChange('pronouns', e.target.value)}
                  placeholder="e.g. They/Them"
                />
              ) : (
                <span className="text-sm font-medium px-1 py-1">{user.pronouns || '-'}</span>
              )}
            </div>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-base-content/70 font-semibold uppercase">Bio</span>
            </label>
            {isEditing ? (
              <textarea
                className="textarea textarea-bordered focus:outline-none w-full leading-relaxed"
                value={currentData.bio || ''}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={3}
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-sm text-base-content/80 whitespace-pre-wrap bg-base-200/50 p-4 rounded-lg border border-base-200 min-h-[80px]">
                {user.bio || <span className="italic text-base-content/50">No bio provided.</span>}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}
