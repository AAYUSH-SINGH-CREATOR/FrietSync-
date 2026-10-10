import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptInvite,
  getFriendlyErrorMessage,
  getMyInvites,
  rejectInvite,
} from '../services/inviteApi';

const getInviteId = (invite) => invite._id || invite.id || invite.inviteId;

const removeInvite = (invites, inviteId) =>
  invites.filter((invite) => getInviteId(invite) !== inviteId);

export const useInvitations = ({
  enabled = true,
  initialLoading = false,
  onInvitesUpdated,
  onInviteAction,
  clearSuccessOnAction = true,
  clearSuccessOnFetch = true,
  successMessages,
} = {}) => {
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const didLoadRef = useRef(false);

  const loadInvites = useCallback(async ({
    showLoading = true,
    clearError = true,
    clearSuccess = clearSuccessOnFetch,
    isCurrent = () => true,
  } = {}) => {
    if (showLoading) setIsLoading(true);
    if (clearError) setErrorMessage('');
    if (clearSuccess) setActionSuccess('');

    try {
      const data = await getMyInvites();
      const list = Array.isArray(data) ? data : [];
      if (isCurrent()) {
        setInvites(list);
        if (Array.isArray(data)) onInvitesUpdated?.(list.length);
      }
      return list;
    } catch (error) {
      if (isCurrent()) setErrorMessage(getFriendlyErrorMessage(error, 'invites'));
      return [];
    } finally {
      if (isCurrent()) {
        didLoadRef.current = true;
        setIsLoading(false);
      }
    }
  }, [clearSuccessOnFetch, onInvitesUpdated]);

  useEffect(() => {
    if (!enabled) return;
    let isActive = true;
    void loadInvites({
      showLoading: initialLoading && !didLoadRef.current,
      clearError: false,
      clearSuccess: false,
      isCurrent: () => isActive,
    });

    return () => {
      isActive = false;
    };
  }, [enabled, initialLoading, loadInvites]);

  const performInviteAction = useCallback(async (invite, action) => {
    const inviteId = getInviteId(invite);
    setProcessingId(inviteId);
    setErrorMessage('');
    if (clearSuccessOnAction) setActionSuccess('');

    try {
      if (action === 'accept') {
        await acceptInvite(inviteId);
      } else {
        await rejectInvite(inviteId);
      }

      setActionSuccess(successMessages?.[action]?.(invite) || '');
      setInvites((previous) => {
        const updated = removeInvite(previous, inviteId);
        onInvitesUpdated?.(updated.length);
        return updated;
      });
      onInviteAction?.();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, `${action}-invite`));
    } finally {
      setProcessingId(null);
    }
  }, [clearSuccessOnAction, onInviteAction, onInvitesUpdated, successMessages]);

  return {
    invites,
    isLoading,
    errorMessage,
    processingId,
    actionSuccess,
    loadInvites,
    acceptInvitation: (invite) => performInviteAction(invite, 'accept'),
    rejectInvitation: (invite) => performInviteAction(invite, 'reject'),
  };
};

export { getInviteId };
