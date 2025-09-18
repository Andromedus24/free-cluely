// Profile Settings Implementation
// =================================

import React, { useState, useCallback, useEffect } from 'react';
import { useSettings, useProfile } from './SettingsProvider';

interface ProfileSettingsProps {
  className?: string;
  onProfileUpdate?: (profile: any) => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  timezone: string;
  language: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland'
];

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
];

export function ProfileSettings({ className = '', onProfileUpdate }: ProfileSettingsProps) {
  const { state, set } = useSettings();
  const { value: profile, set: setProfile } = useProfile();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language.split('-')[0] || 'en',
    bio: '',
    avatar: '',
    location: '',
    website: '',
    social: {
      twitter: '',
      linkedin: '',
      github: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: profile.language || navigator.language.split('-')[0] || 'en',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        location: profile.location || '',
        website: profile.website || '',
        social: {
          twitter: profile.social?.twitter || '',
          linkedin: profile.social?.linkedin || '',
          github: profile.social?.github || ''
        }
      });
      setPreviewAvatar(profile.avatar || '');
    }
  }, [profile]);

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when field changes
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleSocialChange = useCallback((platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social: {
        ...prev.social!,
        [platform]: value
      }
    }));
  }, []);

  const handleAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar: 'Please select an image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ ...prev, avatar: 'Image must be less than 5MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewAvatar(result);
      handleInputChange('avatar', result);
    };
    reader.readAsDataURL(file);
  }, [handleInputChange]);

  const removeAvatar = useCallback(() => {
    setPreviewAvatar('');
    handleInputChange('avatar', '');
  }, [handleInputChange]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Website validation
    if (formData.website) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid URL';
      }
    }

    // Social media validation
    if (formData.social?.twitter && !formData.social.twitter.startsWith('@')) {
      newErrors.twitter = 'Twitter handle should start with @';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const profileData = {
        ...formData,
        updatedAt: Date.now()
      };

      await set('profile', profileData);
      await setProfile(profileData);

      if (onProfileUpdate) {
        onProfileUpdate(profileData);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrors(prev => ({ ...prev, form: (error as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: profile.language || navigator.language.split('-')[0] || 'en',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        location: profile.location || '',
        website: profile.website || '',
        social: {
          twitter: profile.social?.twitter || '',
          linkedin: profile.social?.linkedin || '',
          github: profile.social?.github || ''
        }
      });
      setPreviewAvatar(profile.avatar || '');
    }
    setIsEditing(false);
    setErrors({});
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLanguageInfo = (code: string) => {
    return languages.find(lang => lang.code === code);
  };

  return (
    <div className={`profile-settings ${className}`}>
      <div className="profile-settings-header">
        <h2 className="profile-settings-title">Profile Settings</h2>
        <p className="profile-settings-subtitle">Manage your personal information and account preferences</p>

        {profile?.createdAt && (
          <div className="profile-settings-meta">
            <span className="profile-settings-meta-item">
              Member since {formatDate(profile.createdAt)}
            </span>
            {profile.updatedAt && profile.updatedAt !== profile.createdAt && (
              <span className="profile-settings-meta-item">
                Last updated {formatDate(profile.updatedAt)}
              </span>
            )}
          </div>
        )}
      </div>

      {errors.form && (
        <div className="profile-settings-error">
          {errors.form}
        </div>
      )}

      <div className="profile-settings-content">
        <div className="profile-settings-section">
          <h3 className="profile-settings-section-title">Profile Picture</h3>
          <div className="profile-settings-avatar">
            <div className="profile-settings-avatar-preview">
              {previewAvatar ? (
                <img
                  src={previewAvatar}
                  alt="Profile"
                  className="profile-settings-avatar-image"
                />
              ) : (
                <div className="profile-settings-avatar-placeholder">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '👤'}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="profile-settings-avatar-controls">
                <label className="profile-settings-avatar-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="profile-settings-avatar-input"
                  />
                  Upload New
                </label>
                {previewAvatar && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="profile-settings-avatar-remove"
                  >
                    Remove
                  </button>
                )}
                {errors.avatar && (
                  <p className="profile-settings-field-error">{errors.avatar}</p>
                )}
              </div>
            ) : (
              <div className="profile-settings-avatar-info">
                <p className="profile-settings-avatar-help">
                  Click edit to update your profile picture
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="profile-settings-section">
          <h3 className="profile-settings-section-title">Basic Information</h3>
          <div className="profile-settings-form">
            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Full Name *
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="profile-settings-form-input"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="profile-settings-field-error">{errors.name}</p>
                  )}
                </>
              ) : (
                <p className="profile-settings-form-value">{formData.name || 'Not set'}</p>
              )}
            </div>

            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Email Address
              </label>
              {isEditing ? (
                <>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="profile-settings-form-input"
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="profile-settings-field-error">{errors.email}</p>
                  )}
                </>
              ) : (
                <p className="profile-settings-form-value">{formData.email || 'Not set'}</p>
              )}
            </div>

            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="profile-settings-form-textarea"
                  placeholder="Tell us about yourself"
                  rows={4}
                  maxLength={500}
                />
              ) : (
                <p className="profile-settings-form-value">{formData.bio || 'No bio set'}</p>
              )}
              {isEditing && (
                <p className="profile-settings-form-help">
                  {formData.bio.length}/500 characters
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="profile-settings-section">
          <h3 className="profile-settings-section-title">Location & Contact</h3>
          <div className="profile-settings-form">
            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="profile-settings-form-input"
                  placeholder="City, Country"
                />
              ) : (
                <p className="profile-settings-form-value">{formData.location || 'Not set'}</p>
              )}
            </div>

            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Website
              </label>
              {isEditing ? (
                <>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="profile-settings-form-input"
                    placeholder="https://yourwebsite.com"
                  />
                  {errors.website && (
                    <p className="profile-settings-field-error">{errors.website}</p>
                  )}
                </>
              ) : (
                <p className="profile-settings-form-value">
                  {formData.website ? (
                    <a
                      href={formData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-settings-form-link"
                    >
                      {formData.website}
                    </a>
                  ) : 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="profile-settings-section">
          <h3 className="profile-settings-section-title">Social Media</h3>
          <div className="profile-settings-form">
            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Twitter
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={formData.social?.twitter || ''}
                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                    className="profile-settings-form-input"
                    placeholder="@username"
                  />
                  {errors.twitter && (
                    <p className="profile-settings-field-error">{errors.twitter}</p>
                  )}
                </>
              ) : (
                <p className="profile-settings-form-value">
                  {formData.social?.twitter ? (
                    <a
                      href={`https://twitter.com/${formData.social.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-settings-form-link"
                    >
                      {formData.social.twitter}
                    </a>
                  ) : 'Not set'}
                </p>
              )}
            </div>

            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                LinkedIn
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.social?.linkedin || ''}
                  onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                  className="profile-settings-form-input"
                  placeholder="linkedin.com/in/username"
                />
              ) : (
                <p className="profile-settings-form-value">
                  {formData.social?.linkedin ? (
                    <a
                      href={formData.social.linkedin.startsWith('http') ? formData.social.linkedin : `https://${formData.social.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-settings-form-link"
                    >
                      {formData.social.linkedin}
                    </a>
                  ) : 'Not set'}
                </p>
              )}
            </div>

            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                GitHub
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.social?.github || ''}
                  onChange={(e) => handleSocialChange('github', e.target.value)}
                  className="profile-settings-form-input"
                  placeholder="github.com/username"
                />
              ) : (
                <p className="profile-settings-form-value">
                  {formData.social?.github ? (
                    <a
                      href={formData.social.github.startsWith('http') ? formData.social.github : `https://${formData.social.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-settings-form-link"
                    >
                      {formData.social.github}
                    </a>
                  ) : 'Not set'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="profile-settings-section">
          <h3 className="profile-settings-section-title">Preferences</h3>
          <div className="profile-settings-form">
            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Timezone
              </label>
              {isEditing ? (
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="profile-settings-form-select"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="profile-settings-form-value">{formData.timezone}</p>
              )}
            </div>

            <div className="profile-settings-form-group">
              <label className="profile-settings-form-label">
                Language
              </label>
              {isEditing ? (
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="profile-settings-form-select"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="profile-settings-form-value">
                  {getLanguageInfo(formData.language)?.name || formData.language}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-settings-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="profile-settings-button profile-settings-button-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || state.loading}
              className="profile-settings-button profile-settings-button-save"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="profile-settings-button profile-settings-button-edit"
          >
            Edit Profile
          </button>
        )}
      </div>

      <style jsx>{`
        .profile-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .profile-settings-header {
          margin-bottom: 32px;
        }

        .profile-settings-title {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 600;
          color: #333;
        }

        .profile-settings-subtitle {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 16px;
        }

        .profile-settings-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .profile-settings-meta-item {
          font-size: 14px;
          color: #999;
        }

        .profile-settings-error {
          background: #ffebee;
          color: #c62828;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #ffcdd2;
        }

        .profile-settings-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .profile-settings-section {
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 32px;
        }

        .profile-settings-section:last-child {
          border-bottom: none;
        }

        .profile-settings-section-title {
          margin: 0 0 24px 0;
          font-size: 18px;
          font-weight: 500;
          color: #333;
        }

        .profile-settings-avatar {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .profile-settings-avatar-preview {
          position: relative;
        }

        .profile-settings-avatar-image {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #e0e0e0;
        }

        .profile-settings-avatar-placeholder {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          border: 3px solid #e0e0e0;
        }

        .profile-settings-avatar-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .profile-settings-avatar-upload {
          display: inline-block;
          padding: 8px 16px;
          background: #2196f3;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .profile-settings-avatar-upload:hover {
          background: #1976d2;
        }

        .profile-settings-avatar-input {
          display: none;
        }

        .profile-settings-avatar-remove {
          padding: 8px 16px;
          background: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .profile-settings-avatar-remove:hover {
          background: #eeeeee;
          border-color: #ccc;
        }

        .profile-settings-avatar-info {
          color: #666;
          font-size: 14px;
        }

        .profile-settings-form {
          display: grid;
          gap: 20px;
        }

        .profile-settings-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .profile-settings-form-label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .profile-settings-form-input,
        .profile-settings-form-select,
        .profile-settings-form-textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
        }

        .profile-settings-form-input:focus,
        .profile-settings-form-select:focus,
        .profile-settings-form-textarea:focus {
          outline: none;
          border-color: #2196f3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .profile-settings-form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .profile-settings-form-value {
          margin: 0;
          font-size: 14px;
          color: #666;
          padding: 10px 0;
        }

        .profile-settings-form-link {
          color: #2196f3;
          text-decoration: none;
        }

        .profile-settings-form-link:hover {
          text-decoration: underline;
        }

        .profile-settings-form-help {
          font-size: 12px;
          color: #999;
          margin: 2px 0 0 0;
        }

        .profile-settings-field-error {
          color: #f44336;
          font-size: 12px;
          margin: 2px 0 0 0;
        }

        .profile-settings-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
        }

        .profile-settings-button {
          padding: 10px 20px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .profile-settings-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .profile-settings-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .profile-settings-button-edit {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .profile-settings-button-edit:hover:not(:disabled) {
          background: #1976d2;
          border-color: #1976d2;
        }

        .profile-settings-button-cancel {
          background: #f5f5f5;
          color: #666;
          border-color: #ddd;
        }

        .profile-settings-button-cancel:hover:not(:disabled) {
          background: #eeeeee;
          border-color: #ccc;
        }

        .profile-settings-button-save {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .profile-settings-button-save:hover:not(:disabled) {
          background: #1976d2;
          border-color: #1976d2;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .profile-settings {
            padding: 16px;
          }

          .profile-settings-title {
            font-size: 24px;
          }

          .profile-settings-avatar {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .profile-settings-actions {
            flex-direction: column;
          }

          .profile-settings-button {
            width: 100%;
          }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .profile-settings-title {
            color: #ffffff;
          }

          .profile-settings-subtitle {
            color: #b0b0b0;
          }

          .profile-settings-section-title {
            color: #ffffff;
          }

          .profile-settings-form-label {
            color: #ffffff;
          }

          .profile-settings-form-input,
          .profile-settings-form-select,
          .profile-settings-form-textarea {
            background: #2d2d2d;
            border-color: #404040;
            color: #ffffff;
          }

          .profile-settings-form-input:focus,
          .profile-settings-form-select:focus,
          .profile-settings-form-textarea:focus {
            border-color: #64b5f6;
            box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
          }

          .profile-settings-form-value {
            color: #b0b0b0;
          }

          .profile-settings-form-help {
            color: #666;
          }

          .profile-settings-avatar-placeholder {
            background: #2d2d2d;
            border-color: #404040;
          }

          .profile-settings-error {
            background: #4a1010;
            color: #ef9a9a;
            border-color: #c62828;
          }

          .profile-settings-button-cancel {
            background: #2d2d2d;
            color: #b0b0b0;
            border-color: #404040;
          }

          .profile-settings-button-cancel:hover:not(:disabled) {
            background: #3d3d3d;
            border-color: #505050;
          }

          .profile-settings-button-save {
            background: #1976d2;
            color: white;
            border-color: #1976d2;
          }

          .profile-settings-button-save:hover:not(:disabled) {
            background: #1565c0;
            border-color: #1565c0;
          }
        }
      `}</style>
    </div>
  );
}