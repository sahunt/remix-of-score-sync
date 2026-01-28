import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUsername } from '@/hooks/useUsername';
import { UserAvatar } from '@/components/home/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { ProfileSection } from '@/components/profile/ProfileSection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import rainbowBg from '@/assets/rainbow-bg.png';

// Validation regex for display name: 3-30 chars, alphanumeric + spaces + basic punctuation
const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9 _'\-]{3,30}$/;

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const { username, loading: usernameLoading, refetch: refetchUsername } = useUsername();
  const queryClient = useQueryClient();

  // Display name state
  const [displayName, setDisplayName] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete songs state
  const [deletingSongs, setDeletingSongs] = useState(false);

  // Initialize display name when loaded
  useState(() => {
    if (username && !displayName) {
      setDisplayName(username);
    }
  });

  const handleSaveDisplayName = async () => {
    if (!user) return;

    // Validate
    if (!DISPLAY_NAME_REGEX.test(displayName)) {
      setDisplayNameError('Display name must be 3-30 characters (letters, numbers, spaces, hyphens, underscores, apostrophes)');
      return;
    }

    setDisplayNameError('');
    setSavingDisplayName(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { user_id: user.id, display_name: displayName },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      toast.success('Display name updated');
      refetchUsername();
    } catch (err) {
      console.error('Error saving display name:', err);
      toast.error('Failed to save display name');
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    // Validate
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordError('');
    setSavingPassword(true);

    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        setSavingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      toast.error('Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAllSongs = async () => {
    if (!user) return;

    setDeletingSongs(true);

    try {
      const { error } = await supabase
        .from('user_scores')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Invalidate scores query cache
      queryClient.invalidateQueries({ queryKey: ['user-scores'] });
      toast.success('All songs deleted');
    } catch (err) {
      console.error('Error deleting songs:', err);
      toast.error('Failed to delete songs');
    } finally {
      setDeletingSongs(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="relative min-h-screen">
      {/* Rainbow header background */}
      <header
        className="relative px-[28px] pt-[33px] pb-[60px]"
        style={{
          backgroundImage: `url(${rainbowBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        {/* Back button and avatar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-white"
          >
            <Icon name="arrow_back" size={24} />
          </button>
          <UserAvatar size={40} />
        </div>
      </header>

      {/* Content card */}
      <div className="relative -mt-10 rounded-t-[40px] bg-background min-h-[calc(100vh-120px)] px-7 pt-8 pb-32 space-y-4">
        {/* Display Name Section */}
        <ProfileSection number={1} title="Display Name" defaultOpen>
          <div className="space-y-3">
            <Input
              value={displayName || (usernameLoading ? '' : username || '')}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              error={displayNameError}
              maxLength={30}
            />
            <Button
              onClick={handleSaveDisplayName}
              disabled={savingDisplayName || !displayName}
              className="w-full"
            >
              {savingDisplayName ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </ProfileSection>

        {/* Change Password Section */}
        <ProfileSection number={2} title="Change Password">
          <div className="space-y-3">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              error={passwordError}
            />
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </ProfileSection>

        {/* Danger Zone Section */}
        <ProfileSection number={3} title="Danger Zone" variant="danger">
          <div className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={deletingSongs}
                >
                  {deletingSongs ? 'Deleting...' : 'Delete All Songs'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#3B3F51] border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Songs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your song scores. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllSongs}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              Log Out
            </Button>
          </div>
        </ProfileSection>
      </div>
    </div>
  );
}
