import { useState, useCallback } from 'react';
import { UserType, AuthType } from './constants';

export function useLoginState() {
  const [userType, setUserType] = useState<UserType>('existing');
  const [authType, setAuthType] = useState<AuthType>('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleUserTypeChange = useCallback((type: UserType) => {
    setUserType(type);
    setSubmitSuccess(false);
  }, []);

  const handleAuthTypeChange = useCallback((type: AuthType) => {
    setAuthType(type);
    setSubmitSuccess(false);
  }, []);

  const resetSubmitState = useCallback(() => {
    setIsSubmitting(false);
    setSubmitSuccess(false);
  }, []);

  // Visibility rules
  const showAuthToggle = userType === 'existing';
  const showJiraSection = userType === 'existing';
  const showSignInForm = userType === 'existing' && authType === 'signin';
  const showSignUpForm = userType === 'existing' && authType === 'signup';
  const showExternalForm = userType === 'external';

  return {
    userType,
    authType,
    isSubmitting,
    submitSuccess,
    setIsSubmitting,
    setSubmitSuccess,
    handleUserTypeChange,
    handleAuthTypeChange,
    resetSubmitState,
    showAuthToggle,
    showJiraSection,
    showSignInForm,
    showSignUpForm,
    showExternalForm,
  };
}
