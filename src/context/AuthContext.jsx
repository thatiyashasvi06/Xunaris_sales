import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { INITIAL_USERS } from '../data/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => storageService.getCurrentUser());
  const [activeModule, setActiveModuleState] = useState(() => storageService.getActiveModule());

  // Save changes
  useEffect(() => {
    storageService.setCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    storageService.setActiveModule(activeModule);
  }, [activeModule]);

  const switchUser = (userId) => {
    const found = INITIAL_USERS.find(u => u.id === userId) || INITIAL_USERS[0];
    setCurrentUser(found);

    // Auto-adjust active module if user role is constrained
    if (found.role === 'Sales') {
      setActiveModuleState('crm');
    } else if (found.role === 'Partner' || found.role === 'Recruiter' || found.role === 'Candidate') {
      setActiveModuleState('recruitment');
    }
  };

  const setActiveModule = (mod) => {
    // If role doesn't have permission to that module, protect it
    if (mod === 'crm' && (currentUser.role === 'Partner' || currentUser.role === 'Recruiter' || currentUser.role === 'Candidate')) {
      return;
    }
    setActiveModuleState(mod);
  };

  // RBAC Permission Gates
  const permissions = {
    isAdmin: currentUser.role === 'Admin',
    isSales: currentUser.role === 'Sales',
    isPartner: currentUser.role === 'Partner',
    isRecruiter: currentUser.role === 'Recruiter',
    isCandidate: currentUser.role === 'Candidate',

    // Access to Modules
    canAccessCRM: currentUser.role === 'Admin' || currentUser.role === 'Sales',
    canAccessRecruitment: currentUser.role === 'Admin' || currentUser.role === 'Partner' || currentUser.role === 'Recruiter' || currentUser.role === 'Candidate',

    // Recruitment Specific Actions
    canApprovePartners: currentUser.role === 'Admin',
    canApproveJobs: currentUser.role === 'Admin',
    canInviteRecruiters: currentUser.role === 'Admin' || currentUser.role === 'Partner',
    canPostJobs: currentUser.role === 'Admin' || currentUser.role === 'Partner' || currentUser.role === 'Recruiter',
    canShortlistCandidates: currentUser.role === 'Admin' || currentUser.role === 'Partner' || currentUser.role === 'Recruiter',
    canDownloadResumes: currentUser.role === 'Admin' || currentUser.role === 'Partner' || currentUser.role === 'Recruiter',
    canManageLeads: currentUser.role === 'Admin' || currentUser.role === 'Sales'
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUser,
        availableUsers: INITIAL_USERS,
        activeModule,
        setActiveModule,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
